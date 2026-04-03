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
