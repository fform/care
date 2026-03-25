import { Router } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth';

export const tasksRouter = Router();

const completeSchema = z.object({
  notes: z.string().optional(),
});

tasksRouter.patch('/:taskId/complete', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { notes } = completeSchema.parse(req.body);
    const { userId } = req as unknown as AuthenticatedRequest;
    // TODO: verify user has access, update task in Prisma
    res.json({ data: { id: taskId, status: 'completed', completedByUserId: userId, notes } });
  } catch (err) {
    next(err);
  }
});
