import { useEffect, useRef } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import {
  useFonts,
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
} from '@expo-google-fonts/open-sans';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@care/shared/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const updatesCheckStarted = useRef(false);
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const [fontsLoaded] = useFonts({
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
  });

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    import('expo-notifications').then((Notifications) => {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, string> | undefined;
        if (!data?.type) return;
        if (data.type === 'chat_message' && data.threadId) {
          router.push(`/(tabs)/chat?threadId=${encodeURIComponent(data.threadId)}`);
        } else if (data.type === 'task' && data.circleId) {
          router.push(`/(tabs)/tasks?circleId=${encodeURIComponent(data.circleId)}`);
        } else if (data.type === 'concern' && data.circleId) {
          router.push(`/(tabs)/concerns?circleId=${encodeURIComponent(data.circleId)}`);
        }
      });
    });
    return () => subscription?.remove();
  }, [router]);

  useEffect(() => {
    if (!fontsLoaded || !isInitialized) return;
    if (!Updates.isEnabled || updatesCheckStarted.current) return;
    updatesCheckStarted.current = true;

    let cancelled = false;

    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (cancelled || !result.isAvailable) return;

        Alert.alert(
          'Update available',
          'A new version is ready. Restart now to apply it.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch {
                  Alert.alert(
                    'Update failed',
                    'Could not download the update. Try again later.',
                  );
                }
              },
            },
          ],
        );
      } catch {
        // Ignore network / service errors during startup check
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, isInitialized]);

  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded || !isInitialized) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
