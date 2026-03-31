import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Native URL schemes for `scheme` — must mirror `GOOGLE_*_URL_SCHEME` defaults in `config.ts`.
 * (Do not `import` from `config.ts` here: Expo emits `app.config.js` only; `require('./config')`
 * looks for `config.js` and fails at build time.)
 */
function appUrlSchemes(): string[] {
  const ios =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ??
    'com.googleusercontent.apps.377020404904-aenb5m2ft60mv60tu8ign41ptvo1bn83';
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_URL_SCHEME ?? '';
  const set = new Set<string>(['fformcare', 'care', ios]);
  if (android) set.add(android);
  return [...set];
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Care',
  slug: 'care',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  /** Deep linking + OAuth redirects. First entry is the default app scheme. */
  scheme: appUrlSchemes(),
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#F5F0E8',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.fform.care',
    buildNumber: '1',
    ...(process.env.APPLE_TEAM_ID
      ? { appleTeamId: process.env.APPLE_TEAM_ID }
      : {}),
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
    entitlements: {
      'aps-environment': 'production',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#F5F0E8',
    },
    package: 'com.fform.care',
    versionCode: 1,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-apple-authentication',
    [
      'expo-build-properties',
      {
        ios: { newArchEnabled: true },
        android: { newArchEnabled: true },
      },
    ],
    './plugins/withOptionalSimulatorSigning',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PROJECT_ID,
    },
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/' + process.env.EXPO_PROJECT_ID,
  },
});
