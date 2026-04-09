/**
 * Concerns — time-sensitive items (API), grouped by circle in white rounded sections.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Warning, CheckCircle, Flag, Plus } from 'phosphor-react-native';
import { ScreenTopInset } from '@/components/ScreenTopInset';
import { ScreenEmptyState } from '@/components/ScreenEmptyState';
import { ConcernEntryModal } from '@/components/ConcernEntryModal';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCirclesStore } from '@/store/circles.store';
import { useNavigationStore } from '@/store/navigation.store';
import type { Circle, Concern } from '@care/shared/types';

function formatDueLabel(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function ConcernsScreen() {
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const circles = useCirclesStore((s) => s.circles);
  const concernsByCircle = useCirclesStore((s) => s.concerns);
  const fetchConcerns = useCirclesStore((s) => s.fetchConcerns);
  const fetchCircles = useCirclesStore((s) => s.fetchCircles);
  const refreshAllSummaries = useCirclesStore((s) => s.refreshAllSummaries);
  const resolveConcern = useCirclesStore((s) => s.resolveConcern);

  const [entryOpen, setEntryOpen] = useState(false);

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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title="Concerns"
            subtitle={subtitle}
            right={
              circles.length > 0 ? (
                <Pressable
                  style={styles.fab}
                  onPress={() => setEntryOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Add concern"
                >
                  <Plus size={20} color={colors.textInverse} weight="bold" />
                </Pressable>
              ) : null
            }
          />

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
                      {concern.dueAt ? (
                        <Text style={styles.cardDue}>Due {formatDueLabel(concern.dueAt)}</Text>
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

        <ConcernEntryModal
          visible={entryOpen}
          onDismiss={() => setEntryOpen(false)}
          circles={circles}
          initialCircleId={focusedCircleId}
        />
      </KeyboardAvoidingView>
    </ScreenTopInset>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  cardDue: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  resolveBtn: { padding: spacing[1] },
});
