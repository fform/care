import { prisma } from './prisma';
import { sendExpoPush } from './expoPush';
import { listCircleUserIds } from './circleMember';

/** Deep-link payload keys match app notification handler (string values only for Expo). */
export async function notifyCircleExcept(
  circleId: string,
  exceptUserId: string,
  params: { title: string; body: string; data: Record<string, string> }
): Promise<void> {
  const userIds = await listCircleUserIds(circleId);
  const targets = userIds.filter((id) => id !== exceptUserId);
  if (targets.length === 0) return;

  const tokens = await prisma.deviceToken.findMany({
    where: { userId: { in: targets } },
    select: { token: true },
  });
  if (tokens.length === 0) return;

  await sendExpoPush(
    tokens.map((t) => ({
      to: t.token,
      title: params.title,
      body: params.body,
      data: params.data,
    }))
  );
}
