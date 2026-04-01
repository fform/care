import type { OAuthProvider, Prisma, User } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type AuthUserResponse = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  avatarUrl: string | null;
  authProviders: Array<'google' | 'apple' | 'github' | 'email'>;
  createdAt: string;
  updatedAt: string;
};

export type OAuthProfileInput = {
  provider: OAuthProvider;
  providerId: string;
  email: string | null;
  name: string;
  avatarUrl?: string | null;
};

/**
 * 1) Match existing oauth identity by (provider, provider_id).
 * 2) Else match user by email and link a new oauth row.
 * 3) Else create user + oauth row.
 */
export async function findOrCreateUserFromOAuth(input: OAuthProfileInput): Promise<User> {
  const { provider, providerId, email, name, avatarUrl } = input;

  const existingIdentity = await prisma.oAuthIdentity.findUnique({
    where: {
      provider_providerId: { provider, providerId },
    },
    include: { user: true },
  });

  if (existingIdentity) {
    return prisma.user.update({
      where: { id: existingIdentity.userId },
      data: {
        name: existingIdentity.user.name || name,
        avatarUrl: avatarUrl ?? existingIdentity.user.avatarUrl,
        email: email ?? existingIdentity.user.email,
      },
    });
  }

  if (email) {
    const userByEmail = await prisma.user.findUnique({ where: { email } });
    if (userByEmail) {
      await prisma.oAuthIdentity.create({
        data: {
          userId: userByEmail.id,
          provider,
          providerId,
          email,
          linkedAt: new Date(),
        },
      });
      return prisma.user.update({
        where: { id: userByEmail.id },
        data: {
          name: userByEmail.name || name,
          avatarUrl: avatarUrl ?? userByEmail.avatarUrl,
        },
      });
    }
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        avatarUrl: avatarUrl ?? null,
      },
    });
    await tx.oAuthIdentity.create({
      data: {
        userId: user.id,
        provider,
        providerId,
        email,
        linkedAt: new Date(),
      },
    });
    return user;
  });
}

export async function getAuthProvidersForUser(userId: string): Promise<
  Array<'google' | 'apple' | 'github'>
> {
  const rows = await prisma.oAuthIdentity.findMany({
    where: { userId },
    select: { provider: true },
  });
  return rows.map((r: { provider: OAuthProvider }) => r.provider);
}

export async function getUserResponseForApi(userId: string): Promise<AuthUserResponse | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return null;
  }
  const oauth = await getAuthProvidersForUser(userId);
  const authProviders: AuthUserResponse['authProviders'] = [...oauth];
  if (user.passwordHash) {
    authProviders.push('email');
  }
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    avatarUrl: user.avatarUrl,
    authProviders,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
