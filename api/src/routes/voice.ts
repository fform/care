import { Router } from 'express';
import { z } from 'zod';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';

export const voiceRouter = Router();

const bodySchema = z.object({
  circleIds: z.array(z.string()).optional(),
});

const VOICE_MODEL = 'gpt-4o-realtime-preview';

async function createRealtimeSession(systemPrompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new HttpError(503, 'AI is not configured');
  }

  const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VOICE_MODEL,
      modalities: ['audio', 'text'],
      instructions: systemPrompt,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.7,  // higher = less sensitive, reduces false triggers from speaker bleed
        prefix_padding_ms: 300,
        silence_duration_ms: 700,
      },
      tools: [
        {
          type: 'function',
          name: 'create_task',
          description:
            'Propose a new task for a care circle. The user will review and confirm before it is saved.',
          parameters: {
            type: 'object',
            properties: {
              circleId: {
                type: 'string',
                description: 'The ID of the circle this task belongs to.',
              },
              title: { type: 'string', description: 'Short task title.' },
              description: {
                type: 'string',
                description: 'Optional additional detail about the task.',
              },
              dueAt: {
                type: 'string',
                description: 'Optional ISO-8601 due date/time.',
              },
              isRecurring: {
                type: 'boolean',
                description: 'True if this task repeats every day.',
              },
              recurrenceSlotTimes: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Array of "HH:mm" times (24h) for recurring tasks, e.g. ["08:00","20:00"].',
              },
            },
            required: ['circleId', 'title'],
          },
        },
        {
          type: 'function',
          name: 'switch_circle',
          description:
            'Ask the user to clarify which circle they are talking about when context is ambiguous.',
          parameters: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'Brief explanation of why circle selection is needed.',
              },
            },
            required: ['reason'],
          },
        },
      ],
      tool_choice: 'auto',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[voice] OpenAI realtime session error', res.status, text);
    throw new HttpError(502, 'Could not create voice session');
  }

  const json = (await res.json()) as {
    client_secret?: { value?: string };
  };
  const ephemeralKey = json.client_secret?.value;
  if (!ephemeralKey) {
    throw new HttpError(502, 'No ephemeral key in session response');
  }

  return ephemeralKey;
}

voiceRouter.post('/session', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleIds } = bodySchema.parse(req.body);

    // Fetch user's circles (filtered to requested IDs if provided)
    const memberships = await prisma.circleMember.findMany({
      where: {
        userId,
        ...(circleIds?.length ? { circleId: { in: circleIds } } : {}),
      },
      include: { circle: true },
    });

    if (memberships.length === 0) {
      throw new HttpError(400, 'No accessible circles found');
    }

    const circleIdList = memberships.map((m) => m.circleId);

    // Fetch open tasks and open concerns for context
    const [tasks, concerns] = await Promise.all([
      prisma.task.findMany({
        where: {
          circleId: { in: circleIdList },
          status: { in: ['pending', 'in_progress'] },
        },
        select: { id: true, circleId: true, title: true, isRecurring: true, dueAt: true },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      prisma.concern.findMany({
        where: {
          circleId: { in: circleIdList },
          resolvedAt: null,
        },
        select: { id: true, circleId: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Build system prompt with full context
    const circleBlocks = memberships.map(({ circle }) => {
      const circleTasks = tasks.filter((t) => t.circleId === circle.id);
      const circleConcerns = concerns.filter((c) => c.circleId === circle.id);

      const taskLines =
        circleTasks.length > 0
          ? circleTasks
              .map((t) => {
                const due = t.dueAt ? ` (due ${t.dueAt.toISOString().slice(0, 10)})` : '';
                const recurring = t.isRecurring ? ' [recurring]' : '';
                return `  - [${t.id}] ${t.title}${due}${recurring}`;
              })
              .join('\n')
          : '  (none)';

      const concernLines =
        circleConcerns.length > 0
          ? circleConcerns.map((c) => `  - [${c.id}] ${c.title}`).join('\n')
          : '  (none)';

      return [
        `Circle: "${circle.name}" (ID: ${circle.id})`,
        `  Caring for: ${circle.heartName}`,
        `  Open tasks:\n${taskLines}`,
        `  Open concerns:\n${concernLines}`,
      ].join('\n');
    });

    const systemPrompt = [
      'You are Tend, a warm, practical voice assistant for the Care app — an app that helps families coordinate care for a loved one.',
      '',
      'You are in a voice conversation. Be concise and natural — this is spoken dialogue, not chat.',
      '',
      'The user belongs to these care circles:',
      '',
      circleBlocks.join('\n\n'),
      '',
      'Guidelines:',
      '- When the user describes something that needs doing, use create_task to propose it. Always confirm the circle before creating.',
      '- If the user mentions something vague or you are unsure which circle they mean, call switch_circle so they can clarify.',
      '- Do not claim tasks have been saved — they are proposals the user must approve in the app.',
      '- For medication, feeding, or regular care routines, prefer recurring tasks with explicit daily times.',
      '- Be warm, brief, and practical. Avoid reading back long lists unless asked.',
      `- Today's date is ${new Date().toISOString().slice(0, 10)}.`,
    ].join('\n');

    const ephemeralKey = await createRealtimeSession(systemPrompt);

    res.json({
      data: {
        ephemeralKey,
        circles: memberships.map(({ circle }) => ({
          id: circle.id,
          name: circle.name,
          heartName: circle.heartName,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});
