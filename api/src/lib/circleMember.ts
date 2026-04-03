import type { CircleMember, Circle } from '@prisma/client';
import { prisma } from './prisma';
import { HttpError } from './httpError';

export async function requireCircleMember(
  userId: string,
  circleId: string
): Promise<CircleMember & { circle: Circle }> {
  const m = await prisma.circleMember.findFirst({
    where: { userId, circleId },
    include: { circle: true },
  });
  if (!m) {
    throw new HttpError(403, 'Not a member of this circle');
  }
  return m;
}

export async function listCircleUserIds(circleId: string): Promise<string[]> {
  const rows = await prisma.circleMember.findMany({
    where: { circleId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
