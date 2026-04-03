import { Router } from 'express';
import { z } from 'zod';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { requireCircleMember } from '../lib/circleMember';
import { scheduleDto } from '../dto/circle';

export const schedulesRouter = Router();

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().nullable().optional(),
});

schedulesRouter.patch('/:scheduleId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { scheduleId } = req.params;
    const row = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!row) {
      throw new HttpError(404, 'Schedule not found');
    }
    await requireCircleMember(userId, row.circleId);
    const body = patchSchema.parse(req.body);

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.startsAt !== undefined ? { startsAt: new Date(body.startsAt) } : {}),
        ...(body.endsAt !== undefined
          ? { endsAt: body.endsAt ? new Date(body.endsAt) : null }
          : {}),
      },
    });
    res.json({ data: scheduleDto(updated) });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.delete('/:scheduleId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { scheduleId } = req.params;
    const row = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!row) {
      throw new HttpError(404, 'Schedule not found');
    }
    await requireCircleMember(userId, row.circleId);
    await prisma.schedule.delete({ where: { id: scheduleId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
