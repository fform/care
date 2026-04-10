/**
 * Tasks — checklist & repeating care; due soon first, then the rest.
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
import { CheckCircle, Clipboard, Plus } from 'phosphor-react-native';
import { ScreenTopInset } from '@/components/ScreenTopInset';
import { ScreenEmptyState } from '@/components/ScreenEmptyState';
import { TaskEntryModal } from '@/components/TaskEntryModal';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCirclesStore } from '@/store/circles.store';
import { useNavigationStore } from '@/store/navigation.store';
import type { Task } from '@care/shared/types';

const DUE_SOON_DAYS = 7;

type Row = { task: Task; circleName: string; heartName: string | null };

function isDueSoon(task: Task): boolean {
  if (!task.dueAt) return false;
  const due = new Date(task.dueAt);
  const limit = new Date();
  limit.setDate(limit.getDate() + DUE_SOON_DAYS);
  limit.setHours(23, 59, 59, 999);
  return due.getTime() <= limit.getTime();
}

function sortRows(a: Row, b: Row): number {
  const ta = a.task;
  const tb = b.task;
  const aDue = ta.dueAt ? new Date(ta.dueAt).getTime() : null;
  const bDue = tb.dueAt ? new Date(tb.dueAt).getTime() : null;
  if (aDue != null && bDue != null && aDue !== bDue) return aDue - bDue;
  if (aDue != null && bDue === null) return -1;
  if (aDue === null && bDue != null) return 1;
  return new Date(tb.createdAt).getTime() - new Date(ta.createdAt).getTime();
}

export default function TasksScreen() {
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const circles = useCirclesStore((s) => s.circles);
  const tasksByCircle = useCirclesStore((s) => s.tasks);
  const fetchTasks = useCirclesStore((s) => s.fetchTasks);
  const fetchCircles = useCirclesStore((s) => s.fetchCircles);
  const refreshAllSummaries = useCirclesStore((s) => s.refreshAllSummaries);
  const completeTask = useCirclesStore((s) => s.completeTask);

  const [entryOpen, setEntryOpen] = useState(false);

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

  const { dueSoon, rest } = useMemo(() => {
    const isOpen = (t: Task) => t.status !== 'completed' && t.status !== 'skipped';
    const flat: Row[] = [];

    const addCircle = (circleId: string) => {
      const circle = circles.find((c) => c.id === circleId);
      const name = circle?.name ?? '';
      const heart = circle?.heartName ?? null;
      for (const t of tasksByCircle[circleId] ?? []) {
        if (!isOpen(t)) continue;
        flat.push({ task: t, circleName: name, heartName: heart });
      }
    };

    if (focusedCircleId) {
      addCircle(focusedCircleId);
    } else {
      for (const c of circles) {
        addCircle(c.id);
      }
    }

    const ds = flat.filter((r) => isDueSoon(r.task)).sort(sortRows);
    const r = flat.filter((r) => !isDueSoon(r.task)).sort(sortRows);
    return { dueSoon: ds, rest: r };
  }, [circles, tasksByCircle, focusedCircleId]);

  const subtitle = focusedCircleId
    ? 'Concrete things to do — one-off or repeating (like feedings).'
    : 'All open tasks across your circles — due soon first.';

  const renderCard = (row: Row) => (
    <View key={row.task.id} style={styles.card}>
      <View style={styles.cardText}>
        <Text style={styles.badge}>{row.circleName}</Text>
        {row.heartName ? (
          <Text style={styles.heartLabel}>Caring for {row.heartName}</Text>
        ) : null}
        <Text style={styles.title}>{row.task.title}</Text>
        {row.task.description ? <Text style={styles.desc}>{row.task.description}</Text> : null}
        {row.task.dueAt ? (
          <Text style={styles.dueLine}>
            Due {new Date(row.task.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        ) : null}
        {row.task.isRecurring ? (
          <Text style={styles.recurring}>
            Repeats: {(row.task.recurrenceSlotTimes ?? []).join(', ') || 'scheduled'}
          </Text>
        ) : null}
      </View>
      {!row.task.isRecurring ? (
        <Pressable
          onPress={() => completeTask(row.task.id, row.task.circleId, { date: today })}
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
  );

  const empty = dueSoon.length === 0 && rest.length === 0;

  return (
    <ScreenTopInset testID="tasks-screen">
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
            title="Tasks"
            subtitle={subtitle}
            right={
              circles.length > 0 ? (
                <Pressable
                  style={styles.fab}
                  onPress={() => setEntryOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Add task"
                >
                  <Plus size={20} color={colors.textInverse} weight="bold" />
                </Pressable>
              ) : null
            }
          />

        {empty ? (
          <ScreenEmptyState
            icon={Clipboard}
            title="No open tasks"
            body="Tasks from your circles show here — one-off to-dos and repeating care like walks or meds."
            testID="tasks-empty"
          />
        ) : (
          <>
            {dueSoon.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Due soon</Text>
                {dueSoon.map(renderCard)}
              </View>
            ) : null}
            {rest.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{dueSoon.length > 0 ? 'Later' : 'Open tasks'}</Text>
                {rest.map(renderCard)}
              </View>
            ) : null}
          </>
        )}
        </ScrollView>

        <TaskEntryModal
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
  section: {
    gap: spacing[3],
  },
  sectionLabel: {
    marginHorizontal: spacing[5],
    fontSize: 17,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    marginHorizontal: spacing[5],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  cardText: { flex: 1, minWidth: 0, gap: 4 },
  badge: {
    fontSize: 13,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heartLabel: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  title: {
    fontSize: 20,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  desc: {
    fontSize: 17,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
  },
  dueLine: {
    fontSize: 16,
    fontFamily: 'OpenSans_500Medium',
    color: colors.primary,
  },
  recurring: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  slotHint: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    maxWidth: 100,
  },
  checkHit: { padding: spacing[1] },
  check: {},
});
