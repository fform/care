import { Router, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { DevicePlatform, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  handleGoogleOAuthCallback,
  handleGoogleOAuthHandoff,
  handleGoogleOAuthStart,
} from './googleBrowserOAuth';
import { getUserResponseForApi } from './oauthUserService';
import {
  ACCESS_TOKEN_TTL_SEC,
  issueRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from './tokens';
import { verifyJwt, getUserId } from './middleware';

function nextCaught(next: NextFunction, err: unknown): void {
  next(err instanceof Error ? err : new Error(String(err)));
}

export const authRouter = Router();

const BCRYPT_ROUNDS = 12;

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().optional(),
});

const logoutBodySchema = z.object({
  deviceId: z.string().optional(),
});

const deviceTokenBodySchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  deviceId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceId: z.string().optional(),
});

/**
 * Google Sign-In (web OAuth client): browser hits the API, which runs PKCE + code exchange,
 * then deep-links back to the app with a short-lived handoff JWT.
 */
authRouter.get('/google', handleGoogleOAuthStart);
authRouter.get('/google/callback', handleGoogleOAuthCallback);

/** Public: exchange handoff JWT from `GET /auth/google/callback` redirect for session tokens. */
authRouter.post('/google/handoff', handleGoogleOAuthHandoff);

/** Public: refresh token rotation. */
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const body = refreshBodySchema.parse(req.body);
    const rotated = await rotateRefreshToken(body.refreshToken, body.deviceId);
    const userDto = await getUserResponseForApi(rotated.userId);
    if (!userDto) {
      res.status(500).json({ error: 'User not found', status: 500 });
      return;
    }
    res.json({
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      refreshExpiresAt: rotated.expiresAt.toISOString(),
      user: userDto,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', status: 400, details: err.flatten() });
      return;
    }
    if (err instanceof Error && /Invalid|Expired/.test(err.message)) {
      res.status(401).json({ error: err.message, status: 401 });
      return;
    }
    nextCaught(next, err);
  }
});

/**
 * Email/password — public (obtain tokens). Not covered by “JWT on all auth routes”
 * so first-party login remains possible alongside OAuth.
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
      },
    });
    const accessToken = await signAccessToken(user.id);
    const { token: refreshToken, expiresAt } = await issueRefreshToken(
      user.id,
      body.deviceId
    );
    const userDto = await getUserResponseForApi(user.id);
    if (!userDto) {
      res.status(500).json({ error: 'User not found', status: 500 });
      return;
    }
    res.status(201).json({
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      refreshExpiresAt: expiresAt.toISOString(),
      user: userDto,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', status: 400, details: err.flatten() });
      return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'Email already registered', status: 409 });
      return;
    }
    nextCaught(next, err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user?.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials', status: 401 });
      return;
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials', status: 401 });
      return;
    }
    const accessToken = await signAccessToken(user.id);
    const { token: refreshToken, expiresAt } = await issueRefreshToken(
      user.id,
      body.deviceId
    );
    const userDto = await getUserResponseForApi(user.id);
    if (!userDto) {
      res.status(500).json({ error: 'User not found', status: 500 });
      return;
    }
    res.json({
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      refreshExpiresAt: expiresAt.toISOString(),
      user: userDto,
    });
  } catch (err: unknown) {
    nextCaught(next, err);
  }
});

/** Requires access JWT. */
authRouter.get('/me', verifyJwt, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const userDto = await getUserResponseForApi(userId);
    if (!userDto) {
      res.status(404).json({ error: 'User not found', status: 404 });
      return;
    }
    res.json({ data: userDto });
  } catch (err: unknown) {
    nextCaught(next, err);
  }
});

/** Requires access JWT. */
authRouter.post('/logout', verifyJwt, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const body = logoutBodySchema.parse(req.body ?? {});
    const now = new Date();
    if (body.deviceId) {
      await prisma.refreshToken.updateMany({
        where: { userId, deviceId: body.deviceId, revokedAt: null },
        data: { revokedAt: now },
      });
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    res.status(204).send();
  } catch (err: unknown) {
    nextCaught(next, err);
  }
});

/** Requires access JWT. Upserts push token for (user, token). */
authRouter.post('/device-token', verifyJwt, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const body = deviceTokenBodySchema.parse(req.body);
    const platform =
      body.platform === 'ios' ? DevicePlatform.ios : DevicePlatform.android;

    await prisma.deviceToken.upsert({
      where: {
        userId_token: { userId, token: body.token },
      },
      create: {
        userId,
        token: body.token,
        platform,
      },
      update: {
        platform,
        updatedAt: new Date(),
      },
    });
    res.status(204).send();
  } catch (err: unknown) {
    nextCaught(next, err);
  }
});
