import * as Updates from 'expo-updates';

// ── Google Sign-In (paste from Google Cloud → OAuth client; must match console) ──────────────

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '377020404904-aenb5m2ft60mv60tu8ign41ptvo1bn83.apps.googleusercontent.com';

export const GOOGLE_IOS_URL_SCHEME =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ??
  'com.googleusercontent.apps.377020404904-aenb5m2ft60mv60tu8ign41ptvo1bn83';

export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export const GOOGLE_ANDROID_URL_SCHEME = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_URL_SCHEME ?? '';

// ── App config ──────────────────────────────────────────────────────────────────────────────

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
  apiUrl: 'https://care-api.up.railway.app',
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
 * Google: override client IDs / URL scheme via EXPO_PUBLIC_* env vars if needed.
 */
export default base;
