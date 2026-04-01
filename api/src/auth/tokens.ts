import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '../lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
);

export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  const sub = payload.sub;
  if (!sub) {
    throw new Error('Invalid token');
  }
  return { userId: sub };
}

/** Opaque refresh token: `<id>.<secret>` with bcrypt hash of the full string stored in DB. */
export async function issueRefreshToken(
  userId: string,
  deviceId: string | undefined
): Promise<{ token: string; expiresAt: Date }> {
  const id = randomUUID();
  const secret = randomBytes(48).toString('base64url');
  const fullToken = `${id}.${secret}`;
  const tokenHash = await bcrypt.hash(fullToken, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: {
      id,
      userId,
      tokenHash,
      deviceId: deviceId ?? null,
      expiresAt,
    },
  });

  return { token: fullToken, expiresAt };
}

export async function rotateRefreshToken(
  refreshToken: string,
  deviceId: string | undefined
): Promise<{
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const dot = refreshToken.indexOf('.');
  if (dot <= 0) {
    throw new Error('Invalid refresh token');
  }
  const id = refreshToken.slice(0, dot);

  const row = await prisma.refreshToken.findUnique({ where: { id } });
  if (!row || row.revokedAt) {
    throw new Error('Invalid refresh token');
  }
  if (row.expiresAt < new Date()) {
    throw new Error('Expired refresh token');
  }
  const ok = await bcrypt.compare(refreshToken, row.tokenHash);
  if (!ok) {
    throw new Error('Invalid refresh token');
  }

  const userId = row.userId;
  const nextDeviceId = deviceId ?? row.deviceId ?? undefined;

  await prisma.refreshToken.delete({ where: { id } });

  const accessToken = await signAccessToken(userId);
  const next = await issueRefreshToken(userId, nextDeviceId);

  return {
    userId,
    accessToken,
    refreshToken: next.token,
    expiresAt: next.expiresAt,
  };
}
