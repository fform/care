import * as Updates from 'expo-updates';
import { googleIosUrlSchemeFromClientId } from './googleIosUrlScheme';

/** iOS/Android OAuth client IDs and redirect schemes — set via `EXPO_PUBLIC_*` (see Google Cloud Console). */
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
/** Explicit scheme or derived from `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` so it matches `app.config` `scheme`. */
export const GOOGLE_IOS_URL_SCHEME =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ||
  googleIosUrlSchemeFromClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '');
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
export const GOOGLE_ANDROID_URL_SCHEME = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_URL_SCHEME ?? '';

export type AppEnv = 'dev' | 'preview' | 'production';

export type AppConfig = {
  apiUrl: string;
  mixpanelToken: string;
  env: AppEnv;
  oauth: {
    google: {
      iosClientId: string;
      androidClientId: string;
    };
  };
};

function envFromUpdatesChannel(): AppEnv {
  const channel = Updates.channel;
  if (channel === 'production') return 'production';
  if (channel === 'preview') return 'preview';
  return 'dev';
}

const env = envFromUpdatesChannel();

const base: AppConfig = {
  apiUrl:
    process.env.EXPO_PUBLIC_API_URL ?? 'https://care-api.up.railway.app',
  mixpanelToken: '',
  env,
  oauth: {
    google: {
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    },
  },
};

/**
 * Runtime config. `env` follows `expo-updates` channel (OTA).
 * Google OAuth: the app still needs public client IDs + redirect schemes for `expo-auth-session`;
 * code exchange runs on the API (`GOOGLE_OAUTH_CLIENT_ID` must match the client used here).
 */
export default base;
