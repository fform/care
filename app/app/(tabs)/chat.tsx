/**
 * Chat — default thread for focused circle (API)
 */
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View as MotiView } from 'moti/build/components/view';
import { useLocalSearchParams } from 'expo-router';
import { PaperPlaneTilt } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';
import { useCirclesStore } from '@/store/circles.store';
import { useNavigationStore } from '@/store/navigation.store';
import { useChatStore } from '@/store/chat.store';
import { ScreenHeader } from '@/components/ScreenHeader';

const AVATAR_COLORS = ['#D4916E', '#B8724F', '#6B9E7A', '#E8C4AE', '#6B6B6B'];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ChatScreen() {
  const { threadId: threadIdParam } = useLocalSearchParams<{ threadId?: string }>();
  const user = useAuthStore((s) => s.user);
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const circles = useCirclesStore((s) => s.circles);
  const circle = circles.find((c) => c.id === focusedCircleId);

  const fetchThreads = useChatStore((s) => s.fetchThreads);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const threadsByCircle = useChatStore((s) => s.threadsByCircle);
  const messagesByThread = useChatStore((s) => s.messagesByThread);

  const [message, setMessage] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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

  if (!focusedCircleId || !circle) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Chat"
          subtitle="Select a circle from the Circles tab, then open Chat from the tab bar."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScreenHeader
          title={circle.name}
          subtitle={activeThread?.title ?? 'Conversation'}
        />

        {threads.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
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
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <Text style={styles.empty}>No messages yet — say hello to your circle.</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  threadRow: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[2],
    gap: spacing[2],
    flexDirection: 'row',
  },
  threadChip: {
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

  scroll: { flex: 1 },
  messages: {
    padding: spacing[5],
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  empty: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[8],
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
  msgBody: { flex: 1, gap: spacing[1], maxWidth: '88%' },
  msgBodyYou: { alignSelf: 'flex-end' },
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
});
