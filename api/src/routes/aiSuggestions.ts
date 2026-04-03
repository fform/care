import { Router } from 'express';
import { z } from 'zod';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { requireCircleMember } from '../lib/circleMember';
import { concernDto, scheduleDto, taskDto } from '../dto/circle';

export const aiSuggestionsRouter = Router();

const actionPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create_task'),
    title: z.string().min(1),
    description: z.string().optional(),
    dueAt: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurrenceSlotTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  }),
  z.object({
    type: z.literal('create_concern'),
    title: z.string().min(1),
    description: z.string().optional(),
    dueAt: z.string().optional(),
  }),
  z.object({
    type: z.literal('create_schedule'),
    title: z.string().min(1),
    description: z.string().optional(),
    startsAt: z.string().min(1),
    endsAt: z.string().optional(),
  }),
]);

aiSuggestionsRouter.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const circleId = typeof req.query.circleId === 'string' ? req.query.circleId : undefined;
    if (!circleId) {
      throw new HttpError(400, 'circleId query required');
    }
    await requireCircleMember(userId, circleId);

    const rows = await prisma.aiSuggestedAction.findMany({
      where: { circleId, userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      data: rows.map((r) => ({
        id: r.id,
        circleId: r.circleId,
        threadId: r.threadId,
        payload: r.payload,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

aiSuggestionsRouter.post('/:suggestionId/accept', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { suggestionId } = req.params;

    const suggestion = await prisma.aiSuggestedAction.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion || suggestion.userId !== userId) {
      throw new HttpError(404, 'Suggestion not found');
    }
    if (suggestion.status !== 'pending') {
      throw new HttpError(409, 'Suggestion already handled');
    }

    await requireCircleMember(userId, suggestion.circleId);

    const payload = actionPayloadSchema.parse(suggestion.payload);

    if (payload.type === 'create_task') {
      const isRecurring = Boolean(payload.isRecurring);
      const times = payload.recurrenceSlotTimes;
      if (isRecurring && (!times || times.length === 0)) {
        throw new HttpError(400, 'recurrenceSlotTimes required for recurring task');
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.aiSuggestedAction.update({
        where: { id: suggestionId },
        data: { status: 'accepted', resolvedAt: new Date() },
      });

      if (payload.type === 'create_task') {
        const isRecurring = Boolean(payload.isRecurring);
        const times = payload.recurrenceSlotTimes;
        const task = await tx.task.create({
          data: {
            circleId: suggestion.circleId,
            title: payload.title,
            description: payload.description ?? null,
            dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
            isRecurring,
            recurrenceSlotTimes: isRecurring && times ? times : undefined,
            status: 'pending',
          },
          include: { slotCompletions: true },
        });
        return { kind: 'task' as const, entity: taskDto(task) };
      }

      if (payload.type === 'create_concern') {
        const c = await tx.concern.create({
          data: {
            circleId: suggestion.circleId,
            title: payload.title,
            description: payload.description ?? null,
            dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
          },
        });
        return { kind: 'concern' as const, entity: concernDto(c) };
      }

      const s = await tx.schedule.create({
        data: {
          circleId: suggestion.circleId,
          title: payload.title,
          description: payload.description ?? null,
          startsAt: new Date(payload.startsAt),
          endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
        },
      });
      return { kind: 'schedule' as const, entity: scheduleDto(s) };
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

aiSuggestionsRouter.post('/:suggestionId/reject', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { suggestionId } = req.params;

    const suggestion = await prisma.aiSuggestedAction.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion || suggestion.userId !== userId) {
      throw new HttpError(404, 'Suggestion not found');
    }
    if (suggestion.status !== 'pending') {
      throw new HttpError(409, 'Suggestion already handled');
    }

    await prisma.aiSuggestedAction.update({
      where: { id: suggestionId },
      data: { status: 'rejected', resolvedAt: new Date() },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
