import * as Updates from 'expo-updates';

/** Deep link scheme (must match native URL scheme + API `OAUTH_APP_REDIRECT_SCHEME`). */
export const APP_URL_SCHEME = 'fformcare';

export type AppEnv = 'dev' | 'preview' | 'production';

export type AppConfig = {
  apiUrl: string;
  webUrl: string;
  mixpanelToken: string;
  env: AppEnv;
};

function envFromUpdatesChannel(): AppEnv {
  const channel = Updates.channel;
  if (channel === 'production') return 'production';
  if (channel === 'preview') return 'preview';
  return 'dev';
}

const env = envFromUpdatesChannel();

const base: AppConfig = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://care-api.up.railway.app',
  webUrl: 'https://care-web.up.railway.app',
  mixpanelToken: '',
  env,
};

if (env ==='dev') {
  base.apiUrl = 'https://mac-studio.tail28832a.ts.net';
  base.webUrl = 'http://localhost:5000';
}

/**
 * Runtime config. `env` follows `expo-updates` channel (OTA).
 * Google Sign-In: browser opens `GET {apiUrl}/auth/google`; OAuth + code exchange run on the API.
 */
export default base;
