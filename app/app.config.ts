// @ts-nocheck — keep syntax Expo/EAS can evaluate without full TS (see expo.config docs).
// Keep this file valid as plain JS after TS stripping: no `import type`, no param/return
// annotations, no `as const`, no `new Set<string>` (generics break non-TS parsers).

/**
 * Duplicated from `googleIosUrlScheme.ts` — Expo loads only `app.config.*` here.
 * @param {string} clientId
 */
function googleIosUrlSchemeFromClientId(clientId) {
  const suffix = '.apps.googleusercontent.com';
  if (!clientId || !clientId.endsWith(suffix)) {
    return '';
  }
  const idPart = clientId.slice(0, -suffix.length);
  return `com.googleusercontent.apps.${idPart}`;
}

function appUrlSchemes() {
  const iosExplicit = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? '';
  const iosFromClient = googleIosUrlSchemeFromClientId(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''
  );
  const ios = iosExplicit || iosFromClient;
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_URL_SCHEME ?? '';
  const set = new Set(['fformcare', 'care']);
  if (ios) set.add(ios);
  if (android) set.add(android);
  return [...set];
}

const APP_VERSION = '1.0.0';

export default ({ config }) => ({
  ...config,
  name: 'Care',
  slug: 'care',
  version: APP_VERSION,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
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
    'expo-notifications',
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
    care: {
      distribution: 'development-build',
    },
  },
  runtimeVersion: APP_VERSION,
  updates: {
    url: 'https://u.expo.dev/' + process.env.EXPO_PROJECT_ID,
  },
});
