import { Router } from 'express';
import { z } from 'zod';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { requireCircleMember } from '../lib/circleMember';

export const tendRouter = Router();

const bodySchema = z.object({
  circleId: z.string().min(1),
  threadId: z.string().optional(),
  message: z.string().min(1).max(4000),
});

const SYSTEM = `You are Tend, a warm, practical assistant for the Care app (family caregiving).
Respond with a single JSON object only (no markdown fences), shape:
{
  "reply": string (conversational text for the chat),
  "suggestedActions": [
    {
      "type": "create_task" | "create_concern" | "create_schedule",
      "title": string,
      "description"?: string,
      "dueAt"?: string (ISO-8601, optional),
      "startsAt"?: string (ISO-8601, for schedule),
      "endsAt"?: string,
      "isRecurring"?: boolean,
      "recurrenceSlotTimes"?: string[] (each "HH:mm", only if isRecurring)
    }
  ]
}
Rules:
- suggestedActions can be empty. Do not claim you created anything — these are proposals the user must approve in the app.
- For medication or feeding reminders, prefer recurring tasks with explicit times.
- Be concise.`;

async function callOpenAi(userMessage: string, context: string): Promise<{
  reply: string;
  suggestedActions: Record<string, unknown>[];
}> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new HttpError(503, 'AI is not configured');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Context:\n${context}\n\nUser:\n${userMessage}` },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error('[tend] OpenAI error', res.status, t);
    throw new HttpError(502, 'AI request failed');
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) {
    throw new HttpError(502, 'Empty AI response');
  }

  let parsed: { reply?: string; suggestedActions?: unknown };
  try {
    parsed = JSON.parse(raw) as { reply?: string; suggestedActions?: unknown };
  } catch {
    throw new HttpError(502, 'Invalid AI JSON');
  }

  const reply = typeof parsed.reply === 'string' ? parsed.reply : 'Here is what I suggest.';
  const suggestedActions = Array.isArray(parsed.suggestedActions)
    ? parsed.suggestedActions.filter((x) => x && typeof x === 'object')
    : [];

  return {
    reply,
    suggestedActions: suggestedActions as Record<string, unknown>[],
  };
}

tendRouter.post('/message', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const body = bodySchema.parse(req.body);
    await requireCircleMember(userId, body.circleId);

    const circle = await prisma.circle.findUniqueOrThrow({
      where: { id: body.circleId },
    });

    let threadSnippet = '';
    if (body.threadId) {
      const th = await prisma.chatThread.findFirst({
        where: { id: body.threadId, circleId: body.circleId },
      });
      if (!th) {
        throw new HttpError(404, 'Thread not found');
      }
      const recent = await prisma.chatMessage.findMany({
        where: { threadId: body.threadId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: true },
      });
      threadSnippet = recent
        .reverse()
        .map((m) => `${m.user.name}: ${m.body}`)
        .join('\n');
    }

    const context = [
      `Circle: ${circle.name} (care for ${circle.heartName})`,
      threadSnippet ? `Recent thread messages:\n${threadSnippet}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const { reply, suggestedActions } = await callOpenAi(body.message, context);

    const stored = [];
    for (const action of suggestedActions) {
      const row = await prisma.aiSuggestedAction.create({
        data: {
          circleId: body.circleId,
          userId,
          threadId: body.threadId ?? null,
          payload: action as object,
          status: 'pending',
        },
      });
      stored.push({
        id: row.id,
        payload: row.payload,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      });
    }

    res.json({
      data: {
        reply,
        suggestions: stored,
      },
    });
  } catch (err) {
    next(err);
  }
});
