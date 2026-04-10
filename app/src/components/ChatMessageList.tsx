/**
 * Scrollable message list with debounced read receipts from visible items.
 */
import { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View, type ViewToken } from 'react-native';
import { View as MotiView } from 'moti/build/components/view';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import type { ChatMessage } from '@care/shared/types';
import { useChatStore } from '@/store/chat.store';

const AVATAR_COLORS = ['#D4916E', '#B8724F', '#6B9E7A', '#E8C4AE', '#6B6B6B'];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const READ_DEBOUNCE_MS = 650;

export function ChatMessageList({
  threadId,
  messages,
  currentUserId,
}: {
  threadId: string;
  messages: ChatMessage[];
  currentUserId: string | undefined;
}) {
  const markThreadRead = useChatStore((s) => s.markThreadRead);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTs = useRef(0);
  const pendingIso = useRef<string | null>(null);

  const flushPendingRead = useCallback(() => {
    readTimer.current = null;
    const iso = pendingIso.current;
    if (!iso || !threadId) return;
    pendingIso.current = null;
    pendingTs.current = 0;
    void markThreadRead(threadId, iso);
  }, [threadId, markThreadRead]);

  const scheduleRead = useCallback(
    (iso: string) => {
      const t = new Date(iso).getTime();
      if (Number.isNaN(t) || t < pendingTs.current) return;
      pendingTs.current = t;
      pendingIso.current = iso;
      if (readTimer.current) clearTimeout(readTimer.current);
      readTimer.current = setTimeout(flushPendingRead, READ_DEBOUNCE_MS);
    },
    [flushPendingRead],
  );

  const scheduleReadRef = useRef(scheduleRead);
  scheduleReadRef.current = scheduleRead;

  useEffect(() => {
    pendingTs.current = 0;
    pendingIso.current = null;
    if (readTimer.current) {
      clearTimeout(readTimer.current);
      readTimer.current = null;
    }
  }, [threadId]);

  useEffect(() => {
    return () => {
      if (readTimer.current) clearTimeout(readTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!threadId || messages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 40);
    return () => clearTimeout(t);
  }, [threadId, messages.length]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      let best = 0;
      let bestIso = '';
      for (const vt of viewableItems) {
        const msg = vt.item as ChatMessage;
        const ts = new Date(msg.createdAt).getTime();
        if (ts >= best) {
          best = ts;
          bestIso = msg.createdAt;
        }
      }
      if (bestIso) scheduleReadRef.current(bestIso);
    },
    [],
  );

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 20 },
      onViewableItemsChanged,
    },
  ]).current;

  const renderItem = useCallback(
    ({ item: msg, index }: { item: ChatMessage; index: number }) => {
      const isYou = msg.userId === currentUserId;
      const initial = (msg.user?.name ?? '?').slice(0, 1).toUpperCase();
      const t = new Date(msg.createdAt);
      const time = t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      return (
        <MotiView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: Math.min(index * 40, 400) }}
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
    },
    [currentUserId],
  );

  const keyExtractor = useCallback((m: ChatMessage) => m.id, []);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={styles.messages}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  messages: {
    padding: spacing[5],
    paddingBottom: spacing[4],
    flexGrow: 1,
  },
  message: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  msgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgInitial: {
    fontSize: 18,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textInverse,
  },
  msgSpacer: { width: 36 },
  msgBody: {
    flex: 1,
    gap: spacing[2],
    maxWidth: '88%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  msgBodyYou: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentBg,
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    width: '100%',
  },
  msgAuthor: {
    fontSize: 17,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  msgTime: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  msgText: {
    fontSize: 18,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
    lineHeight: 26,
  },
});
