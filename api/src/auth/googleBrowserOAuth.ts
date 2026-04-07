import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { OAuthProvider } from '@prisma/client';
import { z } from 'zod';
import { verifyGoogleAuthCode } from './providers/google';
import { findOrCreateUserFromOAuth, getUserResponseForApi } from './oauthUserService';
import {
  ACCESS_TOKEN_TTL_SEC,
  issueRefreshToken,
  JWT_SECRET_KEY,
  signAccessToken,
} from './tokens';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const MOBILE_OAUTH_PATH = 'oauth/google';

/**
 * Public base URL for OAuth `redirect_uri` (`{base}/auth/google/callback`).
 * - Railway: `RAILWAY_PUBLIC_DOMAIN` (hostname or full URL)
 * - Local / Tailscale funnel: set `API_PUBLIC_URL` (full URL, e.g. `https://mac-studio….ts.net`)
 */
function getApiPublicUrl(): string {
  const explicit = process.env.API_PUBLIC_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const raw = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (!raw) {
    throw new Error(
      'Set API_PUBLIC_URL (full URL, e.g. https://your-host.ts.net) or RAILWAY_PUBLIC_DOMAIN for Google OAuth redirect_uri'
    );
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, '');
  }
  const host = raw.replace(/\/$/, '');
  const isLocal =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]');
  const protocol = isLocal ? 'http' : 'https';
  return `${protocol}://${host}`;
}

/** Registered in Google Cloud (Web client) as an authorized redirect URI. */
export function getGoogleOAuthRedirectUri(): string {
  return `${getApiPublicUrl()}/auth/google/callback`;
}

function getAppScheme(): string {
  return process.env.OAUTH_APP_REDIRECT_SCHEME?.trim() || 'fformcare';
}

function base64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function newPkceVerifier(): string {
  return base64Url(randomBytes(32));
}

function pkceChallengeS256(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest());
}

async function signOAuthState(codeVerifier: string): Promise<string> {
  return new SignJWT({ cv: codeVerifier })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(JWT_SECRET_KEY);
}

async function verifyOAuthState(state: string): Promise<string> {
  const { payload } = await jwtVerify(state, JWT_SECRET_KEY);
  const cv = payload.cv;
  if (typeof cv !== 'string' || !cv.length) {
    throw new Error('Invalid OAuth state');
  }
  return cv;
}

async function signGoogleHandoff(userId: string): Promise<string> {
  return new SignJWT({ purpose: 'google_oauth_handoff' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('120s')
    .sign(JWT_SECRET_KEY);
}

export async function verifyGoogleHandoffToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
  if (payload.purpose !== 'google_oauth_handoff') {
    throw new Error('Invalid handoff token');
  }
  const sub = payload.sub;
  if (!sub) {
    throw new Error('Invalid handoff subject');
  }
  return { userId: sub };
}

function redirectToApp(res: Response, params: Record<string, string>): void {
  const scheme = getAppScheme();
  const q = new URLSearchParams(params).toString();
  res.redirect(`${scheme}://${MOBILE_OAUTH_PATH}?${q}`);
}

/**
 * Starts Google OAuth (web client + PKCE). Browser is redirected to Google;
 * callback exchanges the code on the server.
 */
export async function handleGoogleOAuthStart(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
    if (!clientId) {
      res.status(503).json({
        error:
          'Google OAuth is not configured: set GOOGLE_OAUTH_CLIENT_ID (and GOOGLE_OAUTH_CLIENT_SECRET) on the API. For local dev, load them via root .env and `pnpm dev:api`.',
        status: 503,
      });
      return;
    }

    let redirectUri: string;
    try {
      redirectUri = getGoogleOAuthRedirectUri();
    } catch (e) {
      res.status(503).json({
        error:
          e instanceof Error
            ? `${e.message} (needed to build https://…/auth/google/callback for Google Cloud)`
            : 'API public URL is not configured for OAuth',
        status: 503,
      });
      return;
    }
    const codeVerifier = newPkceVerifier();
    const state = await signOAuthState(codeVerifier);

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: pkceChallengeS256(codeVerifier),
      code_challenge_method: 'S256',
    });

    res.redirect(`${GOOGLE_AUTH}?${q.toString()}`);
  } catch (err) {
    next(err instanceof Error ? err : new Error(String(err)));
  }
}

function firstQuery(v: unknown): string | undefined {
  if (Array.isArray(v)) {
    return typeof v[0] === 'string' ? v[0] : undefined;
  }
  return typeof v === 'string' ? v : undefined;
}

/** Google redirects here; we exchange the code, create the user, deep-link back to the app. */
export async function handleGoogleOAuthCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const err = firstQuery(req.query.error);
    if (err) {
      const desc = firstQuery(req.query.error_description) ?? err;
      redirectToApp(res, { error: desc });
      return;
    }

    const code = firstQuery(req.query.code);
    const state = firstQuery(req.query.state);
    if (!code || !state) {
      redirectToApp(res, { error: 'Missing code or state from Google' });
      return;
    }

    let codeVerifier: string;
    try {
      codeVerifier = await verifyOAuthState(state);
    } catch {
      redirectToApp(res, { error: 'Invalid or expired OAuth state' });
      return;
    }

    const redirectUri = getGoogleOAuthRedirectUri();
    const profile = await verifyGoogleAuthCode({
      code,
      codeVerifier,
      redirectUri,
    });

    const user = await findOrCreateUserFromOAuth({
      provider: OAuthProvider.google,
      providerId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture ?? null,
    });

    const handoff = await signGoogleHandoff(user.id);
    redirectToApp(res, { handoff });
  } catch (err) {
    next(err instanceof Error ? err : new Error(String(err)));
  }
}

const handoffBodySchema = z.object({
  handoffToken: z.string().min(1),
  deviceId: z.string().optional(),
});

/** Exchange one-time handoff JWT (from deep link) for Care session tokens. */
export async function handleGoogleOAuthHandoff(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = handoffBodySchema.parse(req.body);
    const { userId } = await verifyGoogleHandoffToken(body.handoffToken);

    const accessToken = await signAccessToken(userId);
    const { token: refreshToken, expiresAt } = await issueRefreshToken(
      userId,
      body.deviceId
    );

    const userDto = await getUserResponseForApi(userId);
    if (!userDto) {
      res.status(500).json({ error: 'User not found after sign-in', status: 500 });
      return;
    }

    res.status(200).json({
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
    if (err instanceof Error && /Invalid|expired|handoff|JWT/i.test(err.message)) {
      res.status(401).json({ error: err.message, status: 401 });
      return;
    }
    next(err instanceof Error ? err : new Error(String(err)));
  }
}
