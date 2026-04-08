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
import { View as MotiView } from 'moti/build/components/view';
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
import type { ChatThread, Circle } from '@care/shared/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AVATAR_COLORS = ['#D4916E', '#B8724F', '#6B9E7A', '#E8C4AE', '#6B6B6B'];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
    fetchThreadsForCircles(circles.map((c) => c.id)).finally(() => {
      if (!cancelled) setHubLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [focusedCircleId, circles, fetchThreadsForCircles]);

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
    }
  }, [focusedCircleId, threadIdParam, fetchThreads, fetchMessages]);

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
      return () => {
        setTabBarHideFromHubTransition(false);
        setNewThreadOpen(false);
      };
    }, [setTabBarHideFromHubTransition]),
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
            {hubRows.map(({ thread, circle: c }) => (
              <Pressable
                key={`${c.id}-${thread.id}`}
                style={styles.hubRow}
                onPress={() => openThreadFromHub(c.id, thread.id)}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${thread.title}`}
              >
                <View style={styles.hubRowText}>
                  <Text style={styles.hubCircle}>{c.name}</Text>
                  <Text style={styles.hubThread} numberOfLines={2}>
                    {thread.title}
                  </Text>
                </View>
                <Text style={styles.hubChevron}>›</Text>
              </Pressable>
            ))}
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
              {threads.map((th) => (
                <Pressable
                  key={th.id}
                  style={[styles.threadChip, activeThreadId === th.id && styles.threadChipOn]}
                  onPress={() => {
                    setActiveThreadId(th.id);
                    fetchMessages(th.id);
                  }}
                >
                  <Text style={[styles.threadChipText, activeThreadId === th.id && styles.threadChipTextOn]}>
                    {th.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <ScreenEmptyState
              icon={ChatCircle}
              title="No messages yet"
              body="Say hello — everyone in this circle can see this thread."
              testID="chat-empty-thread"
            />
          ) : null}
          {messages.map((msg, i) => {
            const isYou = msg.userId === user?.id;
            const initial = (msg.user?.name ?? '?').slice(0, 1).toUpperCase();
            const t = new Date(msg.createdAt);
            const time = t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
            return (
              <MotiView
                key={msg.id}
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 20, delay: Math.min(i * 40, 400) }}
                style={styles.message}
              >
                {!isYou ? (
                  <View style={[styles.msgAvatar, { backgroundColor: avatarColor(msg.userId) }]}>
                    <Text style={styles.msgInitial}>{initial}</Text>
                  </View>
                ) : (
                  <View style={styles.msgSpacer} />
                )}
                <View style={[styles.msgBody, isYou && styles.msgBodyYou]}>
                  <View style={styles.msgMeta}>
                    <Text style={styles.msgAuthor}>{isYou ? 'You' : (msg.user?.name ?? 'Member')}</Text>
                    <Text style={styles.msgTime}>{time}</Text>
                  </View>
                  <Text style={styles.msgText}>{msg.body}</Text>
                </View>
              </MotiView>
            );
          })}
        </ScrollView>

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
  hubCircle: {
    fontSize: 11,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hubThread: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  hubChevron: {
    fontSize: 22,
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
  threadChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.accentBg,
  },
  threadChipText: {
    fontSize: 12,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
  },
  threadChipTextOn: { color: colors.primary },

  messages: {
    padding: spacing[5],
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  message: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
  msgSpacer: { width: 36 },
  msgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgInitial: {
    fontSize: 14,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textInverse,
  },
  msgBody: {
    flex: 1,
    gap: spacing[1],
    maxWidth: '88%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  msgBodyYou: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentBg,
  },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  msgAuthor: {
    fontSize: 13,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  msgTime: {
    fontSize: 11,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  msgText: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
    lineHeight: 21,
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
    fontSize: 14,
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
    fontSize: 20,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  modalHint: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[2] },
  modalCancel: { paddingVertical: spacing[3], paddingHorizontal: spacing[4] },
  modalCancelText: { fontSize: 16, fontFamily: 'OpenSans_600SemiBold', color: colors.textMuted },
  modalSave: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  modalSaveOff: { opacity: 0.5 },
  modalSaveText: { fontSize: 16, fontFamily: 'OpenSans_600SemiBold', color: colors.textInverse },
});
