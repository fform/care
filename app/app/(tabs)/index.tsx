/**
 * Today screen — Daily Brief (API)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { View as MotiView } from 'moti/build/components/view';
import { useRouter, useFocusEffect } from 'expo-router';
import { Warning, User, CheckCircle, Flag, Clipboard, ChatCircle, Microphone } from 'phosphor-react-native';
import { ScreenTopInset } from '@/components/ScreenTopInset';
import { ScreenEmptyState } from '@/components/ScreenEmptyState';
import { colors, spacing, radius } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';
import { useCirclesStore } from '@/store/circles.store';
import { useChatStore } from '@/store/chat.store';
import { useNavigationStore } from '@/store/navigation.store';
import { Text } from '@care/shared/components';
import type { Concern, Task } from '@care/shared/types';
import { CircleInvitePanel } from '@/components/CircleInvitePanel';
import { AiVoiceModal } from '@/components/AiVoiceModal';

export default function TodayScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const setFocusedCircleId = useNavigationStore((s) => s.setFocusedCircleId);
  const [voiceVisible, setVoiceVisible] = useState(false);

  const circles = useCirclesStore((s) => s.circles);
  const tasksByCircle = useCirclesStore((s) => s.tasks);
  const concernsByCircle = useCirclesStore((s) => s.concerns);
  const fetchCircles = useCirclesStore((s) => s.fetchCircles);
  const fetchTasks = useCirclesStore((s) => s.fetchTasks);
  const completeTask = useCirclesStore((s) => s.completeTask);
  const totalUnread = useChatStore((s) => s.totalUnread);
  const fetchUnreadSummary = useChatStore((s) => s.fetchUnreadSummary);

  useEffect(() => {
    fetchCircles().then(() => {
      useCirclesStore.getState().refreshAllSummaries();
      fetchUnreadSummary();
    });
  }, [fetchCircles, fetchUnreadSummary]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadSummary();
    }, [fetchUnreadSummary]),
  );

  useEffect(() => {
    if (focusedCircleId) {
      fetchTasks(focusedCircleId);
    }
  }, [focusedCircleId, fetchTasks]);

  const openConcerns = useMemo(() => {
    const open = (c: Concern) => !c.resolvedAt;
    if (focusedCircleId) {
      return (concernsByCircle[focusedCircleId] ?? [])
        .filter(open)
        .map((c) => ({ concern: c, circleLabel: undefined as string | undefined }));
    }
    return circles.flatMap((c) =>
      (concernsByCircle[c.id] ?? [])
        .filter(open)
        .map((x) => ({ concern: x, circleLabel: c.name }))
    );
  }, [circles, concernsByCircle, focusedCircleId]);

  const openTasks = useMemo(() => {
    const isOpen = (t: Task) => t.status !== 'completed' && t.status !== 'skipped';
    if (focusedCircleId) {
      return (tasksByCircle[focusedCircleId] ?? [])
        .filter(isOpen)
        .map((t) => ({ task: t, circleLabel: undefined as string | undefined }));
    }
    return circles.flatMap((c) =>
      (tasksByCircle[c.id] ?? []).filter(isOpen).map((t) => ({ task: t, circleLabel: c.name }))
    );
  }, [circles, tasksByCircle, focusedCircleId]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const focusedCircle = focusedCircleId
    ? circles.find((c) => c.id === focusedCircleId)
    : undefined;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <View style={styles.container}>
      <ScreenTopInset testID="today-screen">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.greeting} numberOfLines={2}>
                {focusedCircle ? focusedCircle.name : `${getGreeting()}, ${firstName}`}
              </Text>
              <Text style={styles.date}>{formatDate(new Date())}</Text>
            </View>
            <View style={styles.headerActions}>
              {focusedCircleId ? (
                <Pressable
                  onPress={() => setFocusedCircleId(null)}
                  style={styles.exitFocus}
                  accessibilityRole="button"
                >
                  <Text style={styles.exitFocusText}>All circles</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                hitSlop={12}
              >
                <User size={24} color={colors.textPrimary} weight="duotone" />
              </Pressable>
            </View>
          </View>
        </MotiView>

        {totalUnread > 0 ? (
          <MotiView
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, delay: 40 }}
            style={styles.unreadWrap}
          >
            <Pressable
              style={styles.unreadRow}
              onPress={() => router.push('/(tabs)/chat')}
              accessibilityRole="button"
              accessibilityLabel={`${totalUnread} unread messages, open chat`}
            >
              <ChatCircle size={22} color={colors.primary} weight="fill" />
              <Text style={styles.unreadText}>
                {totalUnread} unread message{totalUnread === 1 ? '' : 's'}
              </Text>
              <Text style={styles.unreadChevron}>›</Text>
            </Pressable>
          </MotiView>
        ) : null}

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 60 }}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>Concerns</Text>
          <Text style={styles.sectionHint}>
            Time-sensitive or risky — things that need attention soon (not your everyday checklist).
          </Text>
          {openConcerns.length === 0 ? (
            <ScreenEmptyState
              icon={Flag}
              title="Nothing urgent right now"
              body="When something time-sensitive comes up, it’ll show here so the whole circle can see it."
              testID="today-empty-concerns"
            />
          ) : (
            openConcerns.map(({ concern, circleLabel }) => (
              <View key={concern.id} style={styles.concernCard}>
                <Warning size={18} color={colors.warning} weight="fill" />
                <View style={styles.concernBody}>
                  <Text style={styles.concernText}>{concern.title}</Text>
                  {circleLabel ? <Text style={styles.concernMeta}>{circleLabel}</Text> : null}
                </View>
              </View>
            ))
          )}
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 120 }}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>Tasks</Text>
          <Text style={styles.sectionHint}>
            Check off items and repeating care (like meds or walks). Tap to complete when it’s done.
          </Text>
          {openTasks.length === 0 ? (
            <ScreenEmptyState
              icon={Clipboard}
              title="No tasks on your list"
              body="Add tasks from your circle or Today — checklists and repeating care land here."
              testID="today-empty-tasks"
            />
          ) : (
            openTasks.map(({ task, circleLabel }) => (
              <View key={task.id} style={circleLabel ? styles.taskWrap : undefined}>
                {circleLabel ? <Text style={styles.taskCircle}>{circleLabel}</Text> : null}
                <TaskRow
                  task={task}
                  onComplete={() => {
                    if (task.isRecurring) return;
                    completeTask(task.id, task.circleId, { date: today });
                  }}
                />
              </View>
            ))
          )}
        </MotiView>

        {focusedCircle ? (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, delay: 180 }}
          >
            <CircleInvitePanel circle={focusedCircle} />
          </MotiView>
        ) : null}
      </ScrollView>
      </ScreenTopInset>

      {/* Floating AI voice button */}
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 16, delay: 300 }}
        style={styles.fabWrap}
      >
        <Pressable
          style={styles.fab}
          onPress={() => setVoiceVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open AI voice assistant"
        >
          <Microphone size={24} color={colors.textInverse} weight="fill" />
          <Text style={styles.fabText}>Ask Tend</Text>
        </Pressable>
      </MotiView>

      <AiVoiceModal visible={voiceVisible} onDismiss={() => setVoiceVisible(false)} />
    </View>
  );
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const done = task.status === 'completed';
  const canTap = !task.isRecurring && !done;
  return (
    <Pressable
      style={styles.taskRow}
      onPress={canTap ? onComplete : undefined}
      disabled={!canTap}
    >
      <View style={[styles.checkbox, done && styles.checkboxDone]}>
        {done ? <CheckCircle size={22} color={colors.success} weight="fill" /> : null}
      </View>
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskMeta}>
          {task.isRecurring
            ? `Repeats · ${(task.recurrenceSlotTimes ?? []).join(', ') || 'scheduled'}`
            : 'Tap to complete'}
        </Text>
      </View>
    </Pressable>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: spacing[5],
    paddingTop: spacing[6],
    gap: spacing[7],
    paddingBottom: spacing[10] + 72, // extra room for the FAB
  },

  fabWrap: {
    position: 'absolute',
    bottom: spacing[7],
    right: spacing[5],
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: radius.full,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: {
    fontSize: 17,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textInverse,
  },

  header: { gap: spacing[1] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerText: { flex: 1, minWidth: 0, gap: spacing[1] },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flexShrink: 0 },
  exitFocus: {
    paddingVertical: 6,
    paddingHorizontal: spacing[3],
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exitFocusText: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
  },
  greeting: {
    fontSize: 32,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
    lineHeight: 34,
  },
  date: {
    fontSize: 17,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },

  unreadWrap: { marginBottom: -spacing[1] },
  unreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadText: {
    flex: 1,
    fontSize: 19,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  unreadChevron: {
    fontSize: 28,
    color: colors.textMuted,
  },

  section: { gap: spacing[2] },
  sectionLabel: {
    fontSize: 19,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  sectionHint: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: spacing[1],
  },
  concernCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  concernBody: { flex: 1, minWidth: 0 },
  concernText: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
  concernMeta: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },

  taskWrap: { gap: spacing[1] },
  taskCircle: {
    fontSize: 13,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { borderWidth: 0 },
  taskContent: { flex: 1, gap: 2 },
  taskTitle: {
    fontSize: 18,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
  taskMeta: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
});
