import { Router } from 'express';
import { z } from 'zod';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { requireCircleMember } from '../lib/circleMember';
import { concernDto } from '../dto/circle';

export const concernsRouter = Router();

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
});

concernsRouter.patch('/:concernId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { concernId } = req.params;
    const concern = await prisma.concern.findUnique({ where: { id: concernId } });
    if (!concern) {
      throw new HttpError(404, 'Concern not found');
    }
    await requireCircleMember(userId, concern.circleId);
    const body = patchSchema.parse(req.body);

    const updated = await prisma.concern.update({
      where: { id: concernId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.dueAt !== undefined
          ? { dueAt: body.dueAt ? new Date(body.dueAt) : null }
          : {}),
        ...(body.resolvedAt !== undefined
          ? { resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : null }
          : {}),
      },
    });
    res.json({ data: concernDto(updated) });
  } catch (err) {
    next(err);
  }
});

concernsRouter.delete('/:concernId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { concernId } = req.params;
    const concern = await prisma.concern.findUnique({ where: { id: concernId } });
    if (!concern) {
      throw new HttpError(404, 'Concern not found');
    }
    await requireCircleMember(userId, concern.circleId);
    await prisma.concern.delete({ where: { id: concernId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
