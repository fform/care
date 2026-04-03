import { Router } from 'express';
import { z } from 'zod';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { requireCircleMember } from '../lib/circleMember';
import { taskDto } from '../dto/circle';

export const tasksRouter = Router();

const completeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotIndex: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const uncompleteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotIndex: z.number().int().min(0).optional(),
});

const patchTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  dueAt: z.string().nullable().optional(),
  assignedToUserId: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceSlotTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).nullable().optional(),
});

function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) throw new HttpError(400, 'Invalid date');
  return new Date(Date.UTC(y, m - 1, d));
}

tasksRouter.get('/:taskId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { slotCompletions: { orderBy: [{ date: 'desc' }, { slotIndex: 'asc' }] } },
    });
    if (!task) {
      throw new HttpError(404, 'Task not found');
    }
    await requireCircleMember(userId, task.circleId);
    res.json({ data: taskDto(task) });
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch('/:taskId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new HttpError(404, 'Task not found');
    }
    await requireCircleMember(userId, task.circleId);

    const body = patchTaskSchema.parse(req.body);
    const isRecurring = body.isRecurring ?? task.isRecurring;
    const times = body.recurrenceSlotTimes;
    if (isRecurring && times && times.length === 0) {
      throw new HttpError(400, 'recurrenceSlotTimes cannot be empty when recurring');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.dueAt !== undefined
          ? { dueAt: body.dueAt ? new Date(body.dueAt) : null }
          : {}),
        ...(body.assignedToUserId !== undefined
          ? { assignedToUserId: body.assignedToUserId }
          : {}),
        ...(body.isRecurring !== undefined ? { isRecurring: body.isRecurring } : {}),
        ...(body.recurrenceSlotTimes !== undefined
          ? { recurrenceSlotTimes: times ?? undefined }
          : {}),
      },
      include: { slotCompletions: true },
    });
    res.json({ data: taskDto(updated) });
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch('/:taskId/complete', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;
    const body = completeSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new HttpError(404, 'Task not found');
    }
    await requireCircleMember(userId, task.circleId);

    const day = parseDay(body.date);

    if (task.isRecurring) {
      const slots = Array.isArray(task.recurrenceSlotTimes)
        ? (task.recurrenceSlotTimes as unknown[]).map(String)
        : [];
      const slotIndex = body.slotIndex ?? 0;
      if (slots.length > 0 && slotIndex >= slots.length) {
        throw new HttpError(400, 'slotIndex out of range for this task');
      }

      await prisma.taskSlotCompletion.upsert({
        where: {
          taskId_date_slotIndex: {
            taskId,
            date: day,
            slotIndex,
          },
        },
        create: {
          taskId,
          date: day,
          slotIndex,
          completedByUserId: userId,
        },
        update: {
          completedAt: new Date(),
          completedByUserId: userId,
        },
      });
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedByUserId: userId,
          notes: body.notes ?? undefined,
        },
      });
    }

    const fresh = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        slotCompletions: {
          where: { date: day },
        },
      },
    });
    res.json({ data: taskDto(fresh) });
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/:taskId/uncomplete', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;
    const body = uncompleteSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new HttpError(404, 'Task not found');
    }
    await requireCircleMember(userId, task.circleId);

    const day = parseDay(body.date);

    if (task.isRecurring) {
      const slotIndex = body.slotIndex ?? 0;
      await prisma.taskSlotCompletion.deleteMany({
        where: { taskId, date: day, slotIndex },
      });
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'pending',
          completedAt: null,
          completedByUserId: null,
        },
      });
    }

    const fresh = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        slotCompletions: {
          where: { date: day },
        },
      },
    });
    res.json({ data: taskDto(fresh) });
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete('/:taskId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new HttpError(404, 'Task not found');
    }
    await requireCircleMember(userId, task.circleId);
    await prisma.task.delete({ where: { id: taskId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
