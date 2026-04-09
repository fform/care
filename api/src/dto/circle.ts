import type {
  Circle as PrismaCircle,
  CircleMember,
  User,
  Task as PrismaTask,
  Concern as PrismaConcern,
  Plan as PrismaPlan,
  TaskSlotCompletion,
  Schedule as PrismaSchedule,
  ChatThread,
  ChatMessage,
} from '@prisma/client';

export function userPublic(u: User) {
  return {
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
  };
}

export function memberDto(m: CircleMember & { user: User }) {
  return {
    userId: m.userId,
    circleId: m.circleId,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
    user: userPublic(m.user),
  };
}

export function circleDto(
  c: PrismaCircle & { members: (CircleMember & { user: User })[] }
) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    heartName: c.heartName,
    heartAvatarUrl: c.heartAvatar ?? null,
    color: c.color,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    members: c.members.map(memberDto),
  };
}

export function planDto(p: PrismaPlan) {
  return {
    id: p.id,
    circleId: p.circleId,
    title: p.title,
    description: p.description ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function concernDto(c: PrismaConcern) {
  return {
    id: c.id,
    circleId: c.circleId,
    planId: c.planId ?? null,
    title: c.title,
    description: c.description ?? null,
    dueAt: c.dueAt?.toISOString() ?? null,
    resolvedAt: c.resolvedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

export function scheduleDto(s: PrismaSchedule) {
  return {
    id: s.id,
    circleId: s.circleId,
    title: s.title,
    description: s.description ?? null,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function parseSlotTimes(json: unknown): string[] | null {
  if (json == null) return null;
  if (Array.isArray(json)) return json.map((x) => String(x));
  return null;
}

export function taskDto(
  t: PrismaTask & { slotCompletions?: TaskSlotCompletion[] }
) {
  const slots = parseSlotTimes(t.recurrenceSlotTimes);

  return {
    id: t.id,
    circleId: t.circleId,
    planId: t.planId,
    concernId: t.concernId,
    title: t.title,
    description: t.description ?? null,
    assignedToUserId: t.assignedToUserId,
    status: t.status,
    dueAt: t.dueAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    completedByUserId: t.completedByUserId,
    notes: t.notes ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    isRecurring: t.isRecurring,
    recurrenceSlotTimes: slots,
    slotCompletions: (t.slotCompletions ?? []).map((sc) => ({
      id: sc.id,
      taskId: sc.taskId,
      date: sc.date.toISOString().slice(0, 10),
      slotIndex: sc.slotIndex,
      completedAt: sc.completedAt.toISOString(),
      completedByUserId: sc.completedByUserId,
    })),
  };
}

export function threadDto(th: ChatThread) {
  return {
    id: th.id,
    circleId: th.circleId,
    title: th.title,
    isDefault: th.isDefault,
    createdAt: th.createdAt.toISOString(),
  };
}

export function messageDto(m: ChatMessage & { user: User }) {
  return {
    id: m.id,
    threadId: m.threadId,
    userId: m.userId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    user: userPublic(m.user),
  };
}
