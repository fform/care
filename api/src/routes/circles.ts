import { Router } from 'express';
import { z } from 'zod';
import { InviteKind } from '@prisma/client';
import { getUserId } from '../auth';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { requireCircleMember } from '../lib/circleMember';
import { generateInviteSecret } from '../lib/inviteSecret';
import { sendPostmarkEmail } from '../lib/postmark';
import {
  circleDto,
  concernDto,
  planDto,
  scheduleDto,
  taskDto,
  threadDto,
} from '../dto/circle';
import { applyTemplate } from './templates';

export const circlesRouter = Router();

const createCircleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  heartName: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const fromTemplateSchema = z.object({
  template: z.enum(['loved_one', 'kid', 'pet']),
  name: z.string().min(1),
  heartName: z.string().min(1),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const patchCircleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  heartName: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  concernId: z.string().optional(),
  planId: z.string().optional(),
  dueAt: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceSlotTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
});

const createConcernSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().optional(),
  planId: z.string().optional(),
});

const createScheduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
});

const createThreadSchema = z.object({
  title: z.string().min(1),
});

const createInviteSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('link') }),
  z.object({
    kind: z.literal('direct_email'),
    email: z.string().email(),
  }),
  z.object({
    kind: z.literal('direct_phone'),
    phone: z.string().min(5),
  }),
]);

function webBaseUrl(): string {
  return process.env.WEB_PUBLIC_URL ?? process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:3000';
}

function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) throw new HttpError(400, 'Invalid date');
  return new Date(Date.UTC(y, m - 1, d));
}

circlesRouter.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const memberships = await prisma.circleMember.findMany({
      where: { userId },
      include: {
        circle: {
          include: {
            members: { include: { user: true } },
          },
        },
      },
    });
    const data = memberships.map((m) => circleDto(m.circle));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

circlesRouter.post('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const body = createCircleSchema.parse(req.body);

    const circle = await prisma.$transaction(async (tx) => {
      const c = await tx.circle.create({
        data: {
          name: body.name,
          description: body.description ?? null,
          heartName: body.heartName,
          color: body.color ?? '#6B8F71',
        },
      });
      await tx.circleMember.create({
        data: {
          circleId: c.id,
          userId,
          role: 'organizer',
        },
      });
      await tx.chatThread.create({
        data: {
          circleId: c.id,
          title: `About ${body.heartName}`,
          isDefault: true,
        },
      });
      return c;
    });

    const full = await prisma.circle.findUniqueOrThrow({
      where: { id: circle.id },
      include: { members: { include: { user: true } } },
    });
    res.status(201).json({ data: circleDto(full) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.post('/from-template', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const body = fromTemplateSchema.parse(req.body);
    const { circle, seeded } = await applyTemplate(userId, body);
    res.status(201).json({
      data: circleDto(circle),
      seeded,
    });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);
    const circle = await prisma.circle.findUniqueOrThrow({
      where: { id: circleId },
      include: { members: { include: { user: true } } },
    });
    res.json({ data: circleDto(circle) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.patch('/:circleId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    const m = await requireCircleMember(userId, circleId);
    if (m.role !== 'organizer' && m.role !== 'caregiver') {
      throw new HttpError(403, 'Only organizers can edit circle settings');
    }
    const body = patchCircleSchema.parse(req.body);
    const circle = await prisma.circle.update({
      where: { id: circleId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.heartName !== undefined ? { heartName: body.heartName } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
      },
      include: { members: { include: { user: true } } },
    });
    res.json({ data: circleDto(circle) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId/tasks', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);

    const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;
    const day = dateStr
      ? parseDay(dateStr)
      : (() => {
          const n = new Date();
          return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
        })();

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 30));
    const skip = (page - 1) * pageSize;

    const where = { circleId };
    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          slotCompletions: {
            where: { date: day },
          },
        },
      }),
    ]);

    res.json({
      data: tasks.map(taskDto),
      total,
      page,
      pageSize,
      hasMore: skip + tasks.length < total,
    });
  } catch (err) {
    next(err);
  }
});

circlesRouter.post('/:circleId/tasks', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);
    const body = createTaskSchema.parse(req.body);

    const isRecurring = Boolean(body.isRecurring);
    const times = body.recurrenceSlotTimes;
    if (isRecurring && (!times || times.length === 0)) {
      throw new HttpError(400, 'recurrenceSlotTimes required when isRecurring is true');
    }

    let concernId: string | null = body.concernId ?? null;
    if (concernId) {
      const co = await prisma.concern.findFirst({ where: { id: concernId, circleId } });
      if (!co) {
        throw new HttpError(400, 'Concern not found in this circle');
      }
    }

    let planId: string | null = body.planId ?? null;
    if (planId) {
      const plan = await prisma.plan.findFirst({ where: { id: planId, circleId } });
      if (!plan) {
        throw new HttpError(400, 'Plan not found in this circle');
      }
    }

    const task = await prisma.task.create({
      data: {
        circleId,
        title: body.title,
        description: body.description ?? null,
        concernId,
        planId,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        isRecurring,
        recurrenceSlotTimes: isRecurring && times ? times : undefined,
        status: 'pending',
      },
      include: { slotCompletions: true },
    });
    res.status(201).json({ data: taskDto(task) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId/concerns', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 30));
    const skip = (page - 1) * pageSize;

    const where = { circleId };
    const [total, rows] = await Promise.all([
      prisma.concern.count({ where }),
      prisma.concern.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      data: rows.map(concernDto),
      total,
      page,
      pageSize,
      hasMore: skip + rows.length < total,
    });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId/plans', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);

    const rows = await prisma.plan.findMany({
      where: { circleId },
      orderBy: { title: 'asc' },
    });
    res.json({ data: rows.map(planDto) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.post('/:circleId/concerns', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);
    const body = createConcernSchema.parse(req.body);

    let planId: string | null = body.planId ?? null;
    if (planId) {
      const plan = await prisma.plan.findFirst({ where: { id: planId, circleId } });
      if (!plan) {
        throw new HttpError(400, 'Plan not found in this circle');
      }
    }

    const c = await prisma.concern.create({
      data: {
        circleId,
        title: body.title,
        description: body.description ?? null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        planId,
      },
    });
    res.status(201).json({ data: concernDto(c) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId/schedules', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 30));
    const skip = (page - 1) * pageSize;

    const where = { circleId };
    const [total, rows] = await Promise.all([
      prisma.schedule.count({ where }),
      prisma.schedule.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      data: rows.map(scheduleDto),
      total,
      page,
      pageSize,
      hasMore: skip + rows.length < total,
    });
  } catch (err) {
    next(err);
  }
});

circlesRouter.post('/:circleId/schedules', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);
    const body = createScheduleSchema.parse(req.body);

    const s = await prisma.schedule.create({
      data: {
        circleId,
        title: body.title,
        description: body.description ?? null,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
    });
    res.status(201).json({ data: scheduleDto(s) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId/threads', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);

    const threads = await prisma.chatThread.findMany({
      where: { circleId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    res.json({ data: threads.map(threadDto) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.post('/:circleId/threads', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);
    const body = createThreadSchema.parse(req.body);

    const th = await prisma.chatThread.create({
      data: {
        circleId,
        title: body.title,
        isDefault: false,
      },
    });
    res.status(201).json({ data: threadDto(th) });
  } catch (err) {
    next(err);
  }
});

circlesRouter.get('/:circleId/invites', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    await requireCircleMember(userId, circleId);

    const invites = await prisma.circleInvite.findMany({
      where: { circleId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const base = webBaseUrl().replace(/\/$/, '');
    res.json({
      data: invites.map((inv) => ({
        id: inv.id,
        kind: inv.kind,
        invitedEmail: inv.invitedEmail,
        invitedPhone: inv.invitedPhone,
        secretCode: inv.secretCode,
        inviteUrl: `${base}/invite/${inv.secretCode}`,
        expiresAt: inv.expiresAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

circlesRouter.post('/:circleId/invites', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { circleId } = req.params;
    const m = await requireCircleMember(userId, circleId);
    if (m.role !== 'organizer' && m.role !== 'caregiver') {
      throw new HttpError(403, 'Only organizers can invite');
    }

    const body = createInviteSchema.parse(req.body);
    const secretCode = generateInviteSecret();

    const invite = await prisma.circleInvite.create({
      data: {
        circleId,
        inviterUserId: userId,
        secretCode,
        kind:
          body.kind === 'link'
            ? InviteKind.link
            : body.kind === 'direct_email'
              ? InviteKind.direct_email
              : InviteKind.direct_phone,
        invitedEmail: body.kind === 'direct_email' ? body.email : null,
        invitedPhone: body.kind === 'direct_phone' ? body.phone : null,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    const base = webBaseUrl().replace(/\/$/, '');
    const inviteUrl = `${base}/invite/${invite.secretCode}`;

    const circle = await prisma.circle.findUniqueOrThrow({ where: { id: circleId } });
    const inviter = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (body.kind === 'direct_email') {
      const html = `
        <p>${inviter.name} invited you to join <strong>${circle.name}</strong> on Care.</p>
        <p><a href="${inviteUrl}">Accept invitation</a></p>
        <p>If the button does not work, paste this link: ${inviteUrl}</p>
      `;
      await sendPostmarkEmail({
        to: body.email,
        subject: `You're invited to ${circle.name} on Care`,
        htmlBody: html,
      });
    }

    res.status(201).json({
      data: {
        id: invite.id,
        secretCode: invite.secretCode,
        inviteUrl,
        kind: invite.kind,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});
