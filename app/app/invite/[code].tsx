/**
 * Handles `fformcare://invite/:code` — accepts invite then goes to Circles.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { useCirclesStore } from '@/store/circles.store';
import { colors } from '@care/shared/theme';

export default function InviteDeepLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const fetchCircles = useCirclesStore((s) => s.fetchCircles);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || typeof code !== 'string') {
      setError('Invalid invite');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await api.post(`/invites/${code}/accept`, {});
        await fetchCircles();
        if (!cancelled) {
          router.replace('/circles');
        }
      } catch {
        if (!cancelled) {
          setError('Could not accept invite. It may have expired.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, fetchCircles, router]);

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ActivityIndicator size="large" color={colors.primary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  error: { padding: 24, fontFamily: 'OpenSans_400Regular', color: colors.textPrimary, textAlign: 'center' },
});
