import { Router } from 'express';
import { prisma } from '../lib/prisma';

/** Unauthenticated endpoints for marketing web and deep links */
export const publicRouter = Router();

publicRouter.get('/invites/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const invite = await prisma.circleInvite.findUnique({
      where: { secretCode: code },
      include: { circle: true },
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found', status: 404 });
      return;
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      res.status(410).json({ error: 'Invite expired', status: 410 });
      return;
    }

    const inviter = await prisma.user.findUnique({
      where: { id: invite.inviterUserId },
    });

    res.json({
      data: {
        circleName: invite.circle.name,
        circleDescription: invite.circle.description,
        heartName: invite.circle.heartName,
        inviterName: inviter?.name ?? 'Someone',
        expiresAt: invite.expiresAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});
