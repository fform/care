/**
 * Concerns — time-sensitive items (API), grouped by circle in white rounded sections.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Warning, CheckCircle, Flag } from 'phosphor-react-native';
import { ScreenTopInset } from '@/components/ScreenTopInset';
import { ScreenEmptyState } from '@/components/ScreenEmptyState';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCirclesStore } from '@/store/circles.store';
import { useNavigationStore } from '@/store/navigation.store';
import type { Concern } from '@care/shared/types';
import type { Circle } from '@care/shared/types';

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

  const grouped = useMemo(() => {
    const open = (c: Concern) => !c.resolvedAt;
    const list: Circle[] = focusedCircleId
      ? circles.filter((c) => c.id === focusedCircleId)
      : circles;

    return list
      .map((circle) => ({
        circle,
        items: (concernsByCircle[circle.id] ?? []).filter(open),
      }))
      .filter((g) => g.items.length > 0);
  }, [circles, concernsByCircle, focusedCircleId]);

  const subtitle = focusedCircleId
    ? `${circleName} · urgent or time-bound (not your everyday task list).`
    : 'Open concerns across every circle you belong to.';

  return (
    <ScreenTopInset testID="concerns-screen">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Concerns" subtitle={subtitle} />

        {circles.length === 0 ? (
          <ScreenEmptyState
            icon={Flag}
            title="No circles yet"
            body="Create a circle first — then concerns for that group show here."
            testID="concerns-empty-no-circles"
          />
        ) : grouped.length === 0 ? (
          <ScreenEmptyState
            icon={Flag}
            title="No open concerns"
            body="You’re clear for now. Time-sensitive items will appear in these groups."
            testID="concerns-empty-list"
          />
        ) : (
          grouped.map(({ circle, items }) => (
            <View key={circle.id} style={styles.groupCard}>
              <Text style={styles.groupLabel}>{circle.name}</Text>
              {circle.heartName ? (
                <Text style={styles.groupHeart}>Caring for {circle.heartName}</Text>
              ) : null}
              <View style={styles.groupInner}>
                {items.map((concern, i) => (
                  <View key={concern.id} style={[styles.row, i > 0 && styles.rowDivider]}>
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
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenTopInset>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  groupCard: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  groupLabel: {
    fontSize: 15,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  groupHeart: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    marginBottom: spacing[1],
  },
  groupInner: {
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  rowDivider: {
    paddingTop: spacing[3],
    marginTop: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
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
