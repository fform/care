import { prisma } from '../lib/prisma';
import type { Circle, CircleMember, User } from '@prisma/client';

export type TemplateInput = {
  template: 'loved_one' | 'kid' | 'pet';
  name: string;
  heartName: string;
  description?: string;
  color?: string;
};

const SEEDS: Record<
  TemplateInput['template'],
  { concerns: { title: string; description?: string }[]; tasks: { title: string; description?: string; isRecurring?: boolean; recurrenceSlotTimes?: string[] }[] }
> = {
  loved_one: {
    concerns: [
      { title: 'Medication list is current', description: 'Review prescriptions and pharmacy' },
      { title: 'Emergency contacts updated', description: 'ICE sheet shared with circle' },
    ],
    tasks: [
      { title: 'Schedule next primary care visit' },
      { title: 'Confirm home safety checklist', description: 'Rails, lighting, rugs' },
      { title: 'Set up medication reminder routine', isRecurring: true, recurrenceSlotTimes: ['09:00', '21:00'] },
    ],
  },
  kid: {
    concerns: [
      { title: 'School forms due', description: 'Health and pickup permissions' },
    ],
    tasks: [
      { title: 'Add pediatrician and school to shared calendar' },
      { title: 'Pack tomorrow’s backpack', isRecurring: true, recurrenceSlotTimes: ['19:00'] },
    ],
  },
  pet: {
    concerns: [
      { title: 'Vaccinations up to date' },
    ],
    tasks: [
      { title: 'Book annual vet visit' },
      { title: 'Feed and fresh water', isRecurring: true, recurrenceSlotTimes: ['08:00', '18:00'] },
    ],
  },
};

export async function applyTemplate(
  userId: string,
  input: TemplateInput
): Promise<{
  circle: Circle & { members: (CircleMember & { user: User })[] };
  seeded: { concerns: number; tasks: number };
}> {
  const seed = SEEDS[input.template];

  return prisma.$transaction(async (tx) => {
    const circle = await tx.circle.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        heartName: input.heartName,
        color: input.color ?? '#6B8F71',
      },
    });

    await tx.circleMember.create({
      data: { circleId: circle.id, userId, role: 'organizer' },
    });

    await tx.chatThread.create({
      data: {
        circleId: circle.id,
        title: `About ${input.heartName}`,
        isDefault: true,
      },
    });

    let concernsCount = 0;
    for (const c of seed.concerns) {
      await tx.concern.create({
        data: {
          circleId: circle.id,
          title: c.title,
          description: c.description ?? null,
        },
      });
      concernsCount += 1;
    }

    let tasksCount = 0;
    for (const t of seed.tasks) {
      await tx.task.create({
        data: {
          circleId: circle.id,
          title: t.title,
          description: t.description ?? null,
          isRecurring: Boolean(t.isRecurring),
          recurrenceSlotTimes: t.recurrenceSlotTimes ?? undefined,
          status: 'pending',
        },
      });
      tasksCount += 1;
    }

    const full = await tx.circle.findUniqueOrThrow({
      where: { id: circle.id },
      include: { members: { include: { user: true } } },
    });

    return {
      circle: full,
      seeded: { concerns: concernsCount, tasks: tasksCount },
    };
  });
}
