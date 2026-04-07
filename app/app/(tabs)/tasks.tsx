/**
 * Tasks — checklist & repeating care (API)
 */
import { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { CheckCircle } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCirclesStore } from '@/store/circles.store';
import { useNavigationStore } from '@/store/navigation.store';
import type { Task } from '@care/shared/types';

export default function TasksScreen() {
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const circles = useCirclesStore((s) => s.circles);
  const tasksByCircle = useCirclesStore((s) => s.tasks);
  const fetchTasks = useCirclesStore((s) => s.fetchTasks);
  const fetchCircles = useCirclesStore((s) => s.fetchCircles);
  const refreshAllSummaries = useCirclesStore((s) => s.refreshAllSummaries);
  const completeTask = useCirclesStore((s) => s.completeTask);

  const today = new Date().toISOString().slice(0, 10);

  useFocusEffect(
    useCallback(() => {
      fetchCircles().then(() => refreshAllSummaries());
    }, [fetchCircles, refreshAllSummaries])
  );

  useEffect(() => {
    if (focusedCircleId) {
      fetchTasks(focusedCircleId);
    }
  }, [focusedCircleId, fetchTasks]);

  const rows = useMemo(() => {
    const isOpen = (t: Task) => t.status !== 'completed' && t.status !== 'skipped';
    if (focusedCircleId) {
      return (tasksByCircle[focusedCircleId] ?? []).filter(isOpen).map((t) => ({
        task: t,
        label: circles.find((c) => c.id === t.circleId)?.name ?? '',
      }));
    }
    return circles.flatMap((circle) =>
      (tasksByCircle[circle.id] ?? []).filter(isOpen).map((t) => ({
        task: t,
        label: circle.name,
      }))
    );
  }, [circles, tasksByCircle, focusedCircleId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Tasks"
          subtitle="Concrete things to do — one-off or repeating (like feedings). Concerns live on the Concerns tab."
        />

        {rows.length === 0 ? (
          <Text style={styles.empty}>No open tasks.</Text>
        ) : (
          rows.map(({ task, label }) => (
            <View key={task.id} style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.badge}>{label}</Text>
                <Text style={styles.title}>{task.title}</Text>
                {task.description ? (
                  <Text style={styles.desc}>{task.description}</Text>
                ) : null}
                {task.isRecurring ? (
                  <Text style={styles.recurring}>
                    Repeats: {(task.recurrenceSlotTimes ?? []).join(', ') || 'scheduled'}
                  </Text>
                ) : null}
              </View>
              {!task.isRecurring ? (
                <Pressable
                  onPress={() => completeTask(task.id, task.circleId, { date: today })}
                  style={styles.checkHit}
                  accessibilityRole="button"
                  accessibilityLabel="Mark task complete"
                >
                  <View style={styles.check}>
                    <CheckCircle size={24} color={colors.primary} weight="duotone" />
                  </View>
                </Pressable>
              ) : (
                <Text style={styles.slotHint}>Use Today to complete each time slot.</Text>
              )}
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
  cardText: { flex: 1, minWidth: 0, gap: 4 },
  badge: {
    fontSize: 11,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  desc: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
  },
  recurring: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  slotHint: {
    fontSize: 11,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    maxWidth: 100,
  },
  checkHit: { padding: spacing[1] },
  check: {},
});
