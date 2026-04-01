/**
 * Social auth helpers.
 *
 * Google → `expo-auth-session/providers/google` (`useAuthRequest`, PKCE, no client code exchange).
 *          The app sends `code` + `codeVerifier` to `POST /auth/google`; the API exchanges the code.
 * Apple  → expo-apple-authentication (native). Server-side verification not wired yet.
 *
 * OAuth flow patterns: https://docs.expo.dev/guides/authentication/
 * Google client ID + URL scheme: `config.ts` (must match Google Cloud + API `GOOGLE_OAUTH_CLIENT_ID`).
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import config, { GOOGLE_ANDROID_URL_SCHEME, GOOGLE_IOS_URL_SCHEME } from '../../config';

// Required for expo-auth-session redirect on Android (guide: call once at module load).
WebBrowser.maybeCompleteAuthSession();

/** URL scheme Google gave you for this platform (used with `makeRedirectUri`). */
export function googleOAuthUrlScheme(): string {
  if (Platform.OS === 'android' && GOOGLE_ANDROID_URL_SCHEME) {
    return GOOGLE_ANDROID_URL_SCHEME;
  }
  return GOOGLE_IOS_URL_SCHEME;
}

/** Active Google OAuth client ID for this platform, from `config`. */
export function googleOAuthClientId(): string {
  if (Platform.OS === 'android') {
    return config.oauth.google.androidClientId;
  }
  if (Platform.OS === 'ios') {
    return config.oauth.google.iosClientId;
  }
  return '';
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
