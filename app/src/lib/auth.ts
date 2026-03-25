/**
 * Social auth helpers.
 *
 * Google  → expo-auth-session (PKCE). Returns an authorization code sent to the API.
 * Apple   → expo-apple-authentication (native iOS framework). Returns a signed
 *           identityToken JWT sent directly to the API for verification.
 *           No client_secret / p8 key needed on the client side.
 */
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

// Required for expo-auth-session redirect on Android
WebBrowser.maybeCompleteAuthSession();

// ── Google (PKCE via expo-auth-session) ──────────────────────────────────────

export interface GoogleAuthResult {
  provider: 'google';
  code: string;
  redirectUri: string;
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'care' });

  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');

  const request = new AuthSession.AuthRequest({
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) {
    throw new Error(`Google sign-in did not complete: ${result.type}`);
  }

  return { provider: 'google', code: result.params.code, redirectUri };
}

// ── Apple (native iOS framework) ─────────────────────────────────────────────

export interface AppleAuthResult {
  provider: 'apple';
  identityToken: string;
  /** Full name from Apple (only provided on first sign-in — store it) */
  fullName: AppleAuthentication.AppleAuthenticationFullName | null;
}

export async function signInWithApple(): Promise<AppleAuthResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token');
  }

  return {
    provider: 'apple',
    identityToken: credential.identityToken,
    fullName: credential.fullName,
  };
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}
