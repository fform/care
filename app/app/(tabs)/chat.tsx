/**
 * Chat — threads per circle; hub lists all threads across circles when none focused.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CaretLeft, ChatCircle, Circle as CircleIcon, PaperPlaneTilt, Plus } from 'phosphor-react-native';
import { ScreenTopInset } from '@/components/ScreenTopInset';
import { ScreenEmptyState } from '@/components/ScreenEmptyState';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';
import { useCirclesStore } from '@/store/circles.store';
import { TAB_BAR_HIDE_ANIMATION_MS, navigateToTab, useNavigationStore } from '@/store/navigation.store';
import { useChatStore } from '@/store/chat.store';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ChatMessageList } from '@/components/ChatMessageList';
import type { ChatThread, Circle } from '@care/shared/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HubRow = { thread: ChatThread; circle: Circle };

export default function ChatScreen() {
  const { threadId: threadIdParam } = useLocalSearchParams<{ threadId?: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const setFocusedCircleId = useNavigationStore((s) => s.setFocusedCircleId);
  const tabBarHideFromHubTransition = useNavigationStore((s) => s.tabBarHideFromHubTransition);
  const setTabBarHideFromHubTransition = useNavigationStore((s) => s.setTabBarHideFromHubTransition);
  const setTabBarHidden = useNavigationStore((s) => s.setTabBarHidden);
  const circles = useCirclesStore((s) => s.circles);

  const fetchThreads = useChatStore((s) => s.fetchThreads);
  const fetchThreadsForCircles = useChatStore((s) => s.fetchThreadsForCircles);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const createThread = useChatStore((s) => s.createThread);
  const threadsByCircle = useChatStore((s) => s.threadsByCircle);
  const messagesByThread = useChatStore((s) => s.messagesByThread);
  const unreadByThread = useChatStore((s) => s.unreadByThread);
  const fetchUnreadSummary = useChatStore((s) => s.fetchUnreadSummary);

  const [message, setMessage] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hubLoading, setHubLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [creatingThread, setCreatingThread] = useState(false);

  const circle = circles.find((c) => c.id === focusedCircleId);
  const insets = useSafeAreaInsets();

  const hubRows: HubRow[] = useMemo(() => {
    const out: HubRow[] = [];
    for (const c of circles) {
      for (const t of threadsByCircle[c.id] ?? []) {
        out.push({ thread: t, circle: c });
      }
    }
    out.sort((a, b) => {
      const cn = a.circle.name.localeCompare(b.circle.name);
      if (cn !== 0) return cn;
      if (a.thread.isDefault !== b.thread.isDefault) return a.thread.isDefault ? -1 : 1;
      return a.thread.title.localeCompare(b.thread.title);
    });
    return out;
  }, [circles, threadsByCircle]);

  useEffect(() => {
    if (focusedCircleId) return;
    if (circles.length === 0) {
      setHubLoading(false);
      return;
    }
    let cancelled = false;
    setHubLoading(true);
    fetchThreadsForCircles(circles.map((c) => c.id))
      .then(() => fetchUnreadSummary())
      .finally(() => {
        if (!cancelled) setHubLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [focusedCircleId, circles, fetchThreadsForCircles, fetchUnreadSummary]);

  const load = useCallback(async () => {
    if (!focusedCircleId) {
      setLoading(false);
      setActiveThreadId(null);
      return;
    }
    setLoading(true);
    try {
      await fetchThreads(focusedCircleId);
      const list = useChatStore.getState().threadsByCircle[focusedCircleId] ?? [];
      let tid =
        (typeof threadIdParam === 'string' ? threadIdParam : null) ??
        list.find((t) => t.isDefault)?.id ??
        list[0]?.id ??
        null;
      setActiveThreadId(tid);
      if (tid) {
        await fetchMessages(tid);
      }
    } finally {
      setLoading(false);
      fetchUnreadSummary();
    }
  }, [focusedCircleId, threadIdParam, fetchThreads, fetchMessages, fetchUnreadSummary]);

  useEffect(() => {
    load();
  }, [load]);

  const threads = focusedCircleId ? threadsByCircle[focusedCircleId] ?? [] : [];
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? threads[0];
  const messages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];

  const immersiveChat =
    Boolean(focusedCircleId) &&
    Boolean(circle) &&
    !loading &&
    Boolean(activeThreadId);

  useEffect(() => {
    setTabBarHidden(immersiveChat || tabBarHideFromHubTransition);
  }, [immersiveChat, tabBarHideFromHubTransition, setTabBarHidden]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadSummary();
      return () => {
        setTabBarHideFromHubTransition(false);
        setNewThreadOpen(false);
      };
    }, [fetchUnreadSummary, setTabBarHideFromHubTransition]),
  );

  useEffect(() => {
    if (focusedCircleId && !loading) {
      setTabBarHideFromHubTransition(false);
    }
  }, [loading, focusedCircleId, setTabBarHideFromHubTransition]);

  const showBackToToday =
    Boolean(focusedCircleId) && Boolean(circle) && !loading && Boolean(activeThreadId);

  const onSend = async () => {
    const text = message.trim();
    if (!text || !activeThreadId) return;
    setSending(true);
    try {
      await sendMessage(activeThreadId, text);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const openThreadFromHub = (circleId: string, threadId: string) => {
    setTabBarHideFromHubTransition(true);
    setTimeout(() => {
      setFocusedCircleId(circleId);
      router.replace(`/(tabs)/chat?threadId=${encodeURIComponent(threadId)}`);
    }, TAB_BAR_HIDE_ANIMATION_MS);
  };

  const onBackToToday = () => {
    navigateToTab('index');
  };

  const onCreateThread = async () => {
    if (!focusedCircleId || !newThreadTitle.trim()) return;
    setCreatingThread(true);
    try {
      const th = await createThread(focusedCircleId, newThreadTitle.trim());
      setNewThreadOpen(false);
      setNewThreadTitle('');
      setActiveThreadId(th.id);
      await fetchMessages(th.id);
      router.replace(`/(tabs)/chat?threadId=${encodeURIComponent(th.id)}`);
    } finally {
      setCreatingThread(false);
    }
  };

  const onOpenNewThread = () => {
    setNewThreadTitle('');
    setNewThreadOpen(true);
  };

  if (!focusedCircleId) {
    return (
      <ScreenTopInset testID="chat-screen">
        <ScreenHeader
          title="Chat"
          subtitle="All threads across your circles — tap to open. Focus a circle to start from Circles."
        />
        {hubLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : circles.length === 0 ? (
          <ScreenEmptyState
            icon={ChatCircle}
            title="No circles yet"
            body="Create a circle first, then each one gets a General thread and you can add more."
            testID="chat-empty-no-circles"
          />
        ) : hubRows.length === 0 ? (
          <ScreenEmptyState
            icon={ChatCircle}
            title="No threads yet"
            body="Open a circle from Circles to chat — your General thread will be ready."
            testID="chat-empty-hub"
          />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.hubContent}
            showsVerticalScrollIndicator={false}
          >
            {hubRows.map(({ thread, circle: c }) => {
              const n = unreadByThread[thread.id] ?? 0;
              return (
                <Pressable
                  key={`${c.id}-${thread.id}`}
                  style={styles.hubRow}
                  onPress={() => openThreadFromHub(c.id, thread.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${thread.title}`}
                >
                  <View style={styles.hubRowText}>
                    <Text style={styles.hubCircle}>{c.name}</Text>
                    <View style={styles.hubTitleRow}>
                      <Text style={styles.hubThread} numberOfLines={2}>
                        {thread.title}
                      </Text>
                      {n > 0 ? (
                        <View style={styles.hubUnreadBadge}>
                          <Text style={styles.hubUnreadText}>{n > 99 ? '99+' : n}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.hubChevron}>›</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </ScreenTopInset>
    );
  }

  if (!circle) {
    return (
      <ScreenTopInset testID="chat-screen">
        <ScreenHeader title="Chat" subtitle="Circle not found — pick another from Circles." />
      </ScreenTopInset>
    );
  }

  if (loading) {
    return (
      <ScreenTopInset testID="chat-screen">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenTopInset>
    );
  }

  return (
    <ScreenTopInset testID="chat-screen">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScreenHeader
          title={circle.name}
          subtitle={threads.length === 1 ? activeThread?.title ?? undefined : undefined}
          left={
            showBackToToday ? (
              <Pressable
                style={styles.backTodayBtn}
                onPress={onBackToToday}
                accessibilityRole="button"
                accessibilityLabel="Back to Today"
              >
                <CaretLeft size={22} color={colors.primary} weight="bold" />
                <CircleIcon size={22} color={colors.primary} weight="bold" />
              </Pressable>
            ) : undefined
          }
          right={
            <Pressable
              style={styles.newThreadBtn}
              onPress={onOpenNewThread}
              accessibilityRole="button"
              accessibilityLabel="New thread"
            >
              <Plus size={22} color={colors.primary} weight="bold" />
            </Pressable>
          }
        />

        {/*
          Horizontal ScrollView must not flex-grow or it steals vertical space and stretches
          chips into a tall “pill”. Only show the strip when there is more than one thread
          (thread title stays in the header when there is only one).
        */}
        {threads.length > 1 ? (
          <View style={styles.threadStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              style={styles.threadScroll}
              contentContainerStyle={styles.threadRow}
            >
              {threads.map((th) => {
                const n = unreadByThread[th.id] ?? 0;
                return (
                  <Pressable
                    key={th.id}
                    style={[styles.threadChip, activeThreadId === th.id && styles.threadChipOn]}
                    onPress={() => {
                      setActiveThreadId(th.id);
                      fetchMessages(th.id);
                    }}
                  >
                    <View style={styles.threadChipInner}>
                      <Text
                        style={[styles.threadChipText, activeThreadId === th.id && styles.threadChipTextOn]}
                        numberOfLines={1}
                      >
                        {th.title}
                      </Text>
                      {n > 0 ? (
                        <View
                          style={[
                            styles.threadUnreadBadge,
                            activeThreadId === th.id && styles.threadUnreadBadgeOn,
                          ]}
                        >
                          <Text
                            style={[
                              styles.threadUnreadText,
                              activeThreadId === th.id && styles.threadUnreadTextOn,
                            ]}
                          >
                            {n > 99 ? '99+' : n}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.scroll}>
          {messages.length === 0 ? (
            <ScreenEmptyState
              icon={ChatCircle}
              title="No messages yet"
              body="Say hello — everyone in this circle can see this thread."
              testID="chat-empty-thread"
            />
          ) : activeThreadId ? (
            <ChatMessageList
              threadId={activeThreadId}
              messages={messages}
              currentUserId={user?.id}
            />
          ) : null}
        </View>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Message your circle…"
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!sending && Boolean(activeThreadId)}
          />
          <Pressable
            style={[styles.sendBtn, (!message.trim() || sending || !activeThreadId) && styles.sendBtnDisabled]}
            disabled={!message.trim() || sending || !activeThreadId}
            onPress={onSend}
          >
            <PaperPlaneTilt size={18} color={colors.textInverse} weight="fill" />
          </Pressable>
        </View>

        {newThreadOpen ? (
          <Modal
            visible
            animationType="fade"
            transparent
            onRequestClose={() => setNewThreadOpen(false)}
          >
            <View style={styles.modalRoot}>
              <Pressable
                style={styles.modalBackdropFill}
                onPress={() => setNewThreadOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              />
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
                style={styles.modalKeyboardSheet}
              >
                <View style={[styles.modalCard, { paddingBottom: spacing[5] + insets.bottom }]}>
                  <Text style={styles.modalTitle}>New thread</Text>
                  <Text style={styles.modalHint}>Group messages by topic (e.g. appointments, meds).</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Thread title"
                    placeholderTextColor={colors.textMuted}
                    value={newThreadTitle}
                    onChangeText={setNewThreadTitle}
                    editable={!creatingThread}
                  />
                  <View style={styles.modalActions}>
                    <Pressable style={styles.modalCancel} onPress={() => setNewThreadOpen(false)}>
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalSave, (!newThreadTitle.trim() || creatingThread) && styles.modalSaveOff]}
                      disabled={!newThreadTitle.trim() || creatingThread}
                      onPress={onCreateThread}
                    >
                      <Text style={styles.modalSaveText}>{creatingThread ? 'Creating…' : 'Create'}</Text>
                    </Pressable>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        ) : null}
      </KeyboardAvoidingView>
    </ScreenTopInset>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  hubContent: {
    paddingBottom: spacing[10],
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[1],
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  hubRowText: { flex: 1, minWidth: 0, gap: 4 },
  hubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  hubUnreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: colors.concern,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubUnreadText: {
    fontSize: 16,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textInverse,
  },
  hubCircle: {
    fontSize: 13,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hubThread: {
    fontSize: 20,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  hubChevron: {
    fontSize: 28,
    color: colors.textMuted,
    lineHeight: 28,
  },

  newThreadBtn: {
    padding: spacing[1],
  },
  backTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: spacing[1],
    marginLeft: -spacing[1],
  },

  /** Prevents horizontal ScrollView from expanding vertically and stretching chips. */
  threadStrip: {
    flexGrow: 0,
    flexShrink: 0,
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  threadScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 44,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    flexGrow: 0,
  },
  threadChip: {
    flexShrink: 0,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  threadChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 200,
  },
  threadChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.accentBg,
  },
  threadChipText: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
    flexShrink: 1,
  },
  threadChipTextOn: { color: colors.primary },
  threadUnreadBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.concern,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadUnreadBadgeOn: {
    backgroundColor: colors.primary,
  },
  threadUnreadText: {
    fontSize: 12,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textInverse,
  },
  threadUnreadTextOn: {
    color: colors.textInverse,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    fontSize: 18,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },

  modalRoot: {
    flex: 1,
  },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalKeyboardSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[5],
    gap: spacing[3],
  },
  modalTitle: {
    fontSize: 26,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  modalHint: {
    fontSize: 17,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 20,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[2] },
  modalCancel: { paddingVertical: spacing[3], paddingHorizontal: spacing[4] },
  modalCancelText: { fontSize: 20, fontFamily: 'OpenSans_600SemiBold', color: colors.textMuted },
  modalSave: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  modalSaveOff: { opacity: 0.5 },
  modalSaveText: { fontSize: 20, fontFamily: 'OpenSans_600SemiBold', color: colors.textInverse },
});
