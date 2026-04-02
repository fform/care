/**
 * Social auth helpers.
 *
 * Google → API-hosted OAuth (`GET /auth/google` → Google → `GET /auth/google/callback` → deep link
 *          with handoff JWT → `POST /auth/google/handoff`). See `login.tsx` + `auth.store`.
 * Apple  → expo-apple-authentication (native). Server-side verification not wired yet.
 *
 * OAuth patterns: https://docs.expo.dev/guides/authentication/
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

// Required for expo-auth-session-style redirects on Android (guide: call once at module load).
WebBrowser.maybeCompleteAuthSession();

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
