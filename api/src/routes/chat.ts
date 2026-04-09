import { Router } from 'express';
import { z } from 'zod';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { requireCircleMember } from '../lib/circleMember';
import { messageDto } from '../dto/circle';
import { notifyCircleExcept } from '../lib/notifyMembers';

export const chatRouter = Router();

const postMessageSchema = z.object({
  body: z.string().min(1).max(8000),
});

const patchReadSchema = z.object({
  lastReadAt: z.string().min(1),
});

/** Unread = messages from others with createdAt after the user’s read cursor (per thread). */
chatRouter.get('/unread-summary', async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const rows = await prisma.$queryRaw<{ threadId: string; c: bigint }[]>`
      SELECT m."threadId", COUNT(*)::bigint AS c
      FROM "app"."ChatMessage" m
      INNER JOIN "app"."ChatThread" t ON t.id = m."threadId"
      INNER JOIN "app"."CircleMember" cm ON cm."circleId" = t."circleId" AND cm."userId" = ${userId}
      WHERE m."userId" <> ${userId}
      AND m."createdAt" > COALESCE(
        (SELECT r."lastReadAt" FROM "app"."ChatThreadRead" r
         WHERE r."userId" = ${userId} AND r."threadId" = m."threadId"
         LIMIT 1),
        TIMESTAMP '1970-01-01'
      )
      GROUP BY m."threadId"
    `;

    const byThread: Record<string, number> = {};
    let totalUnread = 0;
    for (const r of rows) {
      const n = Number(r.c);
      byThread[r.threadId] = n;
      totalUnread += n;
    }

    res.json({
      data: {
        totalUnread,
        byThread,
      },
    });
  } catch (err) {
    next(err);
  }
});

chatRouter.patch('/threads/:threadId/read', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { threadId } = req.params;
    const body = patchReadSchema.parse(req.body);

    const incoming = new Date(body.lastReadAt);
    if (Number.isNaN(incoming.getTime())) {
      throw new HttpError(400, 'Invalid lastReadAt');
    }

    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new HttpError(404, 'Thread not found');
    }
    await requireCircleMember(userId, thread.circleId);

    const existing = await prisma.chatThreadRead.findUnique({
      where: { userId_threadId: { userId, threadId } },
    });
    const epoch = new Date(0);
    const merged = new Date(
      Math.max((existing?.lastReadAt ?? epoch).getTime(), incoming.getTime()),
    );

    const row = await prisma.chatThreadRead.upsert({
      where: { userId_threadId: { userId, threadId } },
      create: { userId, threadId, lastReadAt: merged },
      update: { lastReadAt: merged },
    });

    res.json({ data: { lastReadAt: row.lastReadAt.toISOString() } });
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/threads/:threadId/messages', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { threadId } = req.params;

    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new HttpError(404, 'Thread not found');
    }
    await requireCircleMember(userId, thread.circleId);

    const take = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take,
      include: { user: true },
    });

    res.json({
      data: messages.map(messageDto),
    });
  } catch (err) {
    next(err);
  }
});

chatRouter.post('/threads/:threadId/messages', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { threadId } = req.params;
    const parsed = postMessageSchema.parse(req.body);

    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new HttpError(404, 'Thread not found');
    }
    await requireCircleMember(userId, thread.circleId);

    const msg = await prisma.chatMessage.create({
      data: {
        threadId,
        userId,
        body: parsed.body,
      },
      include: { user: true },
    });

    const preview =
      parsed.body.length > 120 ? `${parsed.body.slice(0, 117)}…` : parsed.body;
    await notifyCircleExcept(thread.circleId, userId, {
      title: 'New message',
      body: preview,
      data: {
        type: 'chat_message',
        circleId: thread.circleId,
        threadId,
        messageId: msg.id,
      },
    });

    res.status(201).json({ data: messageDto(msg) });
  } catch (err) {
    next(err);
  }
});
