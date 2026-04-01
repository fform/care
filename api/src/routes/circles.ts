import { Router } from 'express';
import type { AuthenticatedRequest } from '../auth';

export const circlesRouter = Router();

circlesRouter.get('/', async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    // TODO: fetch circles where user is a member via Prisma
    res.json({ data: [] });
  } catch (err) {
    next(err);
  }
});

circlesRouter.post('/', async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    // TODO: create circle, assign creator as organizer
    res.status(201).json({ data: {} });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId/tasks', async (req, res, next) => {
  try {
    res.json({ data: [], total: 0, page: 1, pageSize: 20, hasMore: false });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId/concerns', async (req, res, next) => {
  try {
    res.json({ data: [], total: 0, page: 1, pageSize: 20, hasMore: false });
  } catch (err) {
    next(err);
  }
});
