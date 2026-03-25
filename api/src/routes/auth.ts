/**
 * Auth routes — email/password + OAuth.
 * better-auth handles provider linking: if a user tries email login after
 * using Google with the same address, it detects the existing provider and
 * guides them back to the right flow.
 */
import { Router } from 'express';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

export const authRouter = Router();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
);

async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

// ── Email / password ──────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    // TODO: hash password, persist user via Prisma
    // Returning stub response for now
    const userId = 'stub-user-id';
    const token = await signToken(userId);
    res.status(201).json({
      token,
      user: { id: userId, email: body.email, name: body.name, authProviders: ['email'] },
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    // TODO: look up user, verify password hash
    const userId = 'stub-user-id';
    const token = await signToken(userId);
    res.json({
      token,
      user: { id: userId, email: body.email, name: 'User', authProviders: ['email'] },
    });
  } catch (err) {
    next(err);
  }
});

// ── OAuth ─────────────────────────────────────────────────────────────────────

/**
 * Google: receives { provider: 'google', code, redirectUri }
 *   → exchange code with Google token endpoint → verify id_token → find/create user
 *
 * Apple:  receives { provider: 'apple', identityToken, fullName? }
 *   → verify identityToken JWT against Apple's public JWKS → find/create user
 *   → generate client_secret on the fly using p8 key (APPLE_AUTH_KEY, APPLE_KEY_ID, APPLE_TEAM_ID)
 *     only needed if server-side token refresh is required; identity verification
 *     only needs Apple's JWKS public keys.
 */
const googleOAuthSchema = z.object({
  provider: z.literal('google'),
  code: z.string(),
  redirectUri: z.string(),
});

const appleOAuthSchema = z.object({
  provider: z.literal('apple'),
  identityToken: z.string(),
  fullName: z
    .object({
      givenName: z.string().nullable().optional(),
      familyName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const oauthSchema = z.discriminatedUnion('provider', [googleOAuthSchema, appleOAuthSchema]);

authRouter.post('/oauth', async (req, res, next) => {
  try {
    const body = oauthSchema.parse(req.body);

    if (body.provider === 'google') {
      // TODO: POST to https://oauth2.googleapis.com/token with body.code + body.redirectUri
      // Verify returned id_token, extract sub/email/name
      // Find or create User + OAuthAccount in Prisma
      // If email matches existing account with different provider → return { code: 'USE_PROVIDER', provider: '...' }
    } else {
      // TODO: fetch Apple JWKS from https://appleid.apple.com/auth/keys
      // Verify body.identityToken signature + aud/iss claims
      // Extract sub (Apple user ID) + email from token
      // Store fullName on first sign-in (Apple only sends it once)
      // Find or create User + OAuthAccount in Prisma
    }

    const userId = 'stub-user-id';
    const token = await signToken(userId);
    res.json({
      token,
      user: { id: userId, email: null, name: 'User', authProviders: [body.provider] },
    });
  } catch (err) {
    next(err);
  }
});

// ── Session ───────────────────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    // TODO: fetch from Prisma
    res.json({ data: { id: userId, name: 'User', email: null, authProviders: [] } });
  } catch (err) {
    next(err);
  }
});
