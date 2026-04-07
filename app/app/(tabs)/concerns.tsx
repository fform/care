/**
 * Concerns — time-sensitive items (API). Shown when a circle is focused.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Warning, CheckCircle } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCirclesStore } from '@/store/circles.store';
import { useNavigationStore } from '@/store/navigation.store';
import type { Concern } from '@care/shared/types';

export default function ConcernsScreen() {
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const circles = useCirclesStore((s) => s.circles);
  const concernsByCircle = useCirclesStore((s) => s.concerns);
  const fetchConcerns = useCirclesStore((s) => s.fetchConcerns);
  const fetchCircles = useCirclesStore((s) => s.fetchCircles);
  const refreshAllSummaries = useCirclesStore((s) => s.refreshAllSummaries);
  const resolveConcern = useCirclesStore((s) => s.resolveConcern);

  const circleName = circles.find((c) => c.id === focusedCircleId)?.name ?? '';

  useFocusEffect(
    useCallback(() => {
      fetchCircles().then(() => refreshAllSummaries());
    }, [fetchCircles, refreshAllSummaries])
  );

  useEffect(() => {
    if (focusedCircleId) {
      fetchConcerns(focusedCircleId);
    }
  }, [focusedCircleId, fetchConcerns]);

  const rows: Concern[] = useMemo(() => {
    if (!focusedCircleId) return [];
    return (concernsByCircle[focusedCircleId] ?? []).filter((c) => !c.resolvedAt);
  }, [concernsByCircle, focusedCircleId]);

  if (!focusedCircleId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Concerns"
          subtitle="Choose a circle on the Circles tab to focus this app — then Concerns shows that circle’s time-sensitive items."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Concerns"
          subtitle={`${circleName} · urgent or time-bound (not your everyday task list).`}
        />

        {rows.length === 0 ? (
          <Text style={styles.empty}>No open concerns.</Text>
        ) : (
          rows.map((concern) => (
            <View key={concern.id} style={styles.card}>
              <Warning size={20} color={colors.warning} weight="fill" />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{concern.title}</Text>
                {concern.description ? (
                  <Text style={styles.cardDesc}>{concern.description}</Text>
                ) : null}
              </View>
              <Pressable
                style={styles.resolveBtn}
                onPress={() => resolveConcern(concern.id, concern.circleId)}
                accessibilityRole="button"
                accessibilityLabel="Mark concern resolved"
              >
                <CheckCircle size={22} color={colors.success} weight="duotone" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingBottom: spacing[10],
    gap: spacing[3],
  },
  empty: {
    paddingHorizontal: spacing[5],
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  card: {
    marginHorizontal: spacing[5],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
  },
  resolveBtn: { padding: spacing[1] },
});
