import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Expo push token for POST /auth/device-token. Returns null if unavailable.
 *
 * Loads `expo-notifications` lazily so missing native code (e.g. dev client not
 * rebuilt after adding the package) does not crash app startup — register a dev
 * client / run `expo prebuild` + `expo run:ios|android` so the native module exists.
 */
export async function getExpoPushRegistration(): Promise<{
  token: string;
  platform: 'ios' | 'android';
} | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }

  let Notifications: typeof import('expo-notifications');
  try {
    Notifications = await import('expo-notifications');
  } catch {
    return null;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }
    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return {
      token: token.data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    };
  } catch {
    return null;
  }
}
