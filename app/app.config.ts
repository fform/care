import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Care',
  slug: 'care',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'care',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#F5F0E8',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.care.app',
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
    package: 'com.care.app',
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
        // TODO: remove once react-native-onesignal supports new arch
        ios: { newArchEnabled: false },
        android: { newArchEnabled: false },
      },
    ],
    [
      'onesignal-expo-plugin',
      {
        mode: 'production',
      },
    ],
    './plugins/withOptionalSimulatorSigning',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Injected at build time via `op run`
    apiUrl: process.env.API_URL ?? 'http://localhost:3001',
    onesignalAppId: process.env.ONESIGNAL_APP_ID,
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
