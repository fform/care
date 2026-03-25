/**
 * Today screen — the Daily Brief.
 * "What do I need to care about right now?"
 */
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Card, Text } from '@care/shared/components';
import { colors, spacing } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';
import { useCirclesStore } from '@/store/circles.store';

export default function TodayScreen() {
  const user = useAuthStore((s) => s.user);
  const { circles, concerns, tasks, fetchCircles } = useCirclesStore();

  useEffect(() => {
    fetchCircles();
  }, []);

  const greeting = getGreeting();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        style={styles.header}
      >
        <Text variant="labelCaps" color={colors.textSecondary}>
          {greeting}
        </Text>
        <Text variant="displayMedium">{user?.name ?? 'There'}</Text>
      </MotiView>

      {/* Placeholder until we have real data */}
      {circles.length === 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, delay: 100 }}
        >
          <Card padding={6} style={styles.emptyCard}>
            <Text variant="headingMedium" style={{ marginBottom: spacing[2] }}>
              Welcome to Care
            </Text>
            <Text variant="bodyMedium" color={colors.textSecondary}>
              Create your first circle to get started — invite the people who help you care.
            </Text>
          </Card>
        </MotiView>
      )}
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing[6],
    paddingTop: spacing[16],
    gap: spacing[6],
  },
  header: { gap: spacing[1] },
  emptyCard: { marginTop: spacing[2] },
});
