import { Router } from 'express';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { circleDto } from '../dto/circle';

export const inviteAcceptRouter = Router();

inviteAcceptRouter.post('/:code/accept', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { code } = req.params;

    const invite = await prisma.circleInvite.findUnique({
      where: { secretCode: code },
      include: { circle: true },
    });

    if (!invite) {
      throw new HttpError(404, 'Invite not found');
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new HttpError(410, 'Invite expired');
    }

    const existing = await prisma.circleMember.findFirst({
      where: { circleId: invite.circleId, userId },
    });
    if (existing) {
      const circle = await prisma.circle.findUniqueOrThrow({
        where: { id: invite.circleId },
        include: { members: { include: { user: true } } },
      });
      res.json({ data: circleDto(circle), alreadyMember: true });
      return;
    }

    await prisma.circleMember.create({
      data: {
        circleId: invite.circleId,
        userId,
        role: 'supporter',
      },
    });

    const circle = await prisma.circle.findUniqueOrThrow({
      where: { id: invite.circleId },
      include: { members: { include: { user: true } } },
    });

    res.status(201).json({ data: circleDto(circle), alreadyMember: false });
  } catch (err) {
    next(err);
  }
});
