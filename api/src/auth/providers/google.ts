import { ClientAuthentication, OAuth2Client } from 'google-auth-library';

export type GoogleIdTokenPayload = {
  sub: string;
  email: string | null;
  name: string;
  picture?: string;
};

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || undefined;

/**
 * Exchange authorization code (PKCE) for tokens, verify `id_token`, return user fields.
 * Google access/refresh tokens are not returned — they stay inside this function.
 */
export async function verifyGoogleAuthCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GoogleIdTokenPayload> {
  if (!clientId) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID is not configured');
  }

  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: params.redirectUri,
    clientAuthentication: clientSecret
      ? ClientAuthentication.ClientSecretPost
      : ClientAuthentication.None,
  });

  const { tokens } = await oauth2Client.getToken({
    code: params.code,
    codeVerifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
  });

  const idToken = tokens.id_token;
  if (!idToken) {
    throw new Error('Google token response did not include id_token');
  }

  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error('Invalid Google id_token payload');
  }

  return {
    sub: payload.sub,
    email: payload.email ?? null,
    name: payload.name ?? payload.email ?? 'User',
    picture: payload.picture,
  };
}
