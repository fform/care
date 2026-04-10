/**
 * AiVoiceModal — full-screen AI voice assistant panel.
 *
 * - Connects to OpenAI Realtime on open
 * - Shows scrolling transcript (user turns + AI turns)
 * - Inline task suggestion cards with Add / Edit / Skip
 * - Circle chips for quick context-switching
 * - Animated status indicator (listening pulse / AI waveform)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { View as MotiView } from 'moti/build/components/view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  X,
  Check,
  PencilSimple,
  Minus,
  Warning,
  ArrowCounterClockwise,
} from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius, shadow } from '@care/shared/theme';
import { useCirclesStore } from '@/store/circles.store';
import { TaskEntryModal } from '@/components/TaskEntryModal';
import {
  useVoiceChat,
  type TaskSuggestion,
  type TranscriptEntry,
  type VoiceChatCircle,
} from '@/hooks/useVoiceChat';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

type EditState = {
  circleId: string;
  title: string;
  description?: string;
  dueAt?: string;
  isRecurring?: boolean;
  recurrenceSlotTimes?: string[];
};

// ── Status indicator ─────────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <MotiView
      from={{ scale: 1, opacity: 0.6 }}
      animate={active ? { scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] } : { scale: 1, opacity: 0.3 }}
      transition={
        active
          ? { type: 'timing', duration: 900, loop: true }
          : { type: 'timing', duration: 200 }
      }
      style={[styles.dot, active && styles.dotActive]}
    />
  );
}

function VoiceIndicator({
  status,
  isPaused,
}: {
  status: string;
  isPaused: boolean;
}) {
  const listening = status === 'listening' && !isPaused;
  const speaking = status === 'ai_speaking';
  const connecting = status === 'connecting';

  if (connecting) {
    return (
      <View style={styles.indicatorRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.indicatorText}>Connecting…</Text>
      </View>
    );
  }

  return (
    <View style={styles.indicatorRow}>
      <View style={styles.dotsRow}>
        <StatusDot active={listening || speaking} />
        <StatusDot active={listening || speaking} />
        <StatusDot active={listening || speaking} />
      </View>
      <View style={styles.indicatorIconWrap}>
        {speaking ? (
          <SpeakerHigh size={18} color={colors.primary} weight="fill" />
        ) : isPaused ? (
          <MicrophoneSlash size={18} color={colors.textDisabled} weight="fill" />
        ) : (
          <Microphone
            size={18}
            color={listening ? colors.primary : colors.textDisabled}
            weight={listening ? 'fill' : 'regular'}
          />
        )}
      </View>
      <Text style={[styles.indicatorText, (!listening && !speaking) && styles.indicatorTextMuted]}>
        {speaking ? 'Tend is speaking…' : isPaused ? 'Mic paused' : listening ? 'Listening…' : 'Ready'}
      </Text>
    </View>
  );
}

// ── Transcript row ────────────────────────────────────────────────────────────

function TranscriptRow({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === 'user';
  return (
    <View style={[styles.transcriptRow, isUser && styles.transcriptRowUser]}>
      <View style={[styles.transcriptBubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{entry.text}</Text>
      </View>
    </View>
  );
}

// ── Task suggestion card ──────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onConfirm,
  onEdit,
  onDismiss,
}: {
  suggestion: TaskSuggestion;
  onConfirm: () => void;
  onEdit: () => void;
  onDismiss: () => void;
}) {
  if (suggestion.status !== 'pending') {
    const isDone = suggestion.status === 'confirmed';
    return (
      <View style={[styles.suggestionCard, styles.suggestionCardDone]}>
        <View style={styles.suggestionCardDoneRow}>
          {isDone ? (
            <Check size={16} color={colors.success} weight="bold" />
          ) : (
            <Minus size={16} color={colors.textMuted} weight="bold" />
          )}
          <Text style={[styles.suggestionDoneText, !isDone && styles.suggestionDismissedText]}>
            {suggestion.title}
          </Text>
        </View>
        {isDone && suggestion.circleName ? (
          <Text style={styles.suggestionMeta}>Added to {suggestion.circleName}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18 }}
      style={styles.suggestionCard}
    >
      <View style={styles.suggestionHeader}>
        <Text style={styles.suggestionLabel}>Suggested task</Text>
        {suggestion.circleName ? (
          <Text style={styles.suggestionCircle}>{suggestion.circleName}</Text>
        ) : null}
      </View>

      <Text style={styles.suggestionTitle}>{suggestion.title}</Text>

      {suggestion.description ? (
        <Text style={styles.suggestionDesc}>{suggestion.description}</Text>
      ) : null}

      <View style={styles.suggestionMeta2Row}>
        {suggestion.dueAt ? (
          <Text style={styles.suggestionMeta}>
            Due {new Date(suggestion.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        ) : null}
        {suggestion.isRecurring ? (
          <Text style={styles.suggestionMeta}>
            Repeats · {(suggestion.recurrenceSlotTimes ?? []).join(', ') || 'daily'}
          </Text>
        ) : null}
      </View>

      <View style={styles.suggestionActions}>
        <Pressable style={styles.suggestionSkip} onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.suggestionSkipText}>Skip</Text>
        </Pressable>
        <Pressable style={styles.suggestionEdit} onPress={onEdit} accessibilityRole="button">
          <PencilSimple size={16} color={colors.primary} weight="bold" />
          <Text style={styles.suggestionEditText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.suggestionAdd} onPress={onConfirm} accessibilityRole="button">
          <Check size={16} color={colors.textInverse} weight="bold" />
          <Text style={styles.suggestionAddText}>Add task</Text>
        </Pressable>
      </View>
    </MotiView>
  );
}

// ── Circle chips ──────────────────────────────────────────────────────────────

function CircleChips({
  circles,
  onSelect,
}: {
  circles: VoiceChatCircle[];
  onSelect: (circle: VoiceChatCircle) => void;
}) {
  if (circles.length <= 1) return null;
  return (
    <View style={styles.circleChipsWrap}>
      <Text style={styles.circleChipsLabel}>Talking about:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.circleChipsRow}
      >
        {circles.map((c) => (
          <Pressable
            key={c.id}
            style={styles.circleChip}
            onPress={() => onSelect(c)}
            accessibilityRole="button"
            accessibilityLabel={`Select circle ${c.name}`}
          >
            <Text style={styles.circleChipText}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Combined transcript + suggestions list item ───────────────────────────────

type ListItem =
  | { kind: 'transcript'; entry: TranscriptEntry }
  | { kind: 'suggestion'; suggestion: TaskSuggestion };

// ── Main modal ────────────────────────────────────────────────────────────────

export function AiVoiceModal({ visible, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const circles = useCirclesStore((s) => s.circles);
  const listRef = useRef<FlatList>(null);

  const {
    status,
    isPaused,
    transcript,
    suggestions,
    circles: sessionCircles,
    error,
    connect,
    disconnect,
    pause,
    resume,
    interruptAi,
    startNewConversation,
    sendText,
    confirmSuggestion,
    dismissSuggestion,
  } = useVoiceChat();

  const [editState, setEditState] = useState<EditState | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Connect when modal opens, disconnect when it closes
  useEffect(() => {
    if (visible) {
      void connect();
    } else {
      disconnect();
      setEditState(null);
      setShowEditModal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Scroll to bottom whenever transcript/suggestions change
  useEffect(() => {
    if (transcript.length > 0 || suggestions.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [transcript, suggestions]);

  const handleCircleSelect = useCallback(
    (circle: VoiceChatCircle) => {
      sendText(`I'm talking about the ${circle.name} circle (caring for ${circle.heartName}).`);
    },
    [sendText],
  );

  const handleEdit = useCallback(
    (suggestion: TaskSuggestion) => {
      setEditState({
        circleId: suggestion.circleId,
        title: suggestion.title,
        description: suggestion.description,
        dueAt: suggestion.dueAt ? suggestion.dueAt : undefined,
        isRecurring: suggestion.isRecurring,
        recurrenceSlotTimes: suggestion.recurrenceSlotTimes,
      });
      setShowEditModal(true);
    },
    [],
  );

  const handleDismiss = useCallback(() => {
    disconnect();
    onDismiss();
  }, [disconnect, onDismiss]);

  // Build flat list data merging transcript + suggestion cards
  const listData: ListItem[] = [];
  let sugIdx = 0;

  for (const entry of transcript) {
    listData.push({ kind: 'transcript', entry });
    // Insert any pending suggestions after the last assistant turn
    if (entry.role === 'assistant') {
      while (sugIdx < suggestions.length) {
        listData.push({ kind: 'suggestion', suggestion: suggestions[sugIdx] });
        sugIdx++;
      }
    }
  }
  // Insert remaining suggestions at the end
  while (sugIdx < suggestions.length) {
    listData.push({ kind: 'suggestion', suggestion: suggestions[sugIdx] });
    sugIdx++;
  }

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'transcript') {
        return <TranscriptRow entry={item.entry} />;
      }
      return (
        <SuggestionCard
          suggestion={item.suggestion}
          onConfirm={() => void confirmSuggestion(item.suggestion.id)}
          onEdit={() => handleEdit(item.suggestion)}
          onDismiss={() => dismissSuggestion(item.suggestion.id)}
        />
      );
    },
    [confirmSuggestion, dismissSuggestion, handleEdit],
  );

  const keyExtractor = useCallback(
    (item: ListItem) =>
      item.kind === 'transcript' ? item.entry.id : item.suggestion.id,
    [],
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDismiss}
      >
        <View
          style={[
            styles.root,
            { paddingTop: insets.top || spacing[5] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Tend</Text>
              <Text style={styles.headerSub}>AI voice assistant</Text>
            </View>
            <View style={styles.headerRight}>
              {/* Pause / Resume mic button */}
              {(status === 'listening' || status === 'ai_speaking' || isPaused) ? (
                <Pressable
                  style={[styles.headerBtn, isPaused && styles.headerBtnActive]}
                  onPress={isPaused ? resume : pause}
                  accessibilityRole="button"
                  accessibilityLabel={isPaused ? 'Resume microphone' : 'Pause microphone'}
                  hitSlop={8}
                >
                  {isPaused ? (
                    <Microphone size={18} color={colors.primary} weight="fill" />
                  ) : (
                    <MicrophoneSlash size={18} color={colors.textSecondary} weight="fill" />
                  )}
                </Pressable>
              ) : null}

              {/* New conversation button — only when paused */}
              {isPaused ? (
                <Pressable
                  style={styles.headerBtn}
                  onPress={() => void startNewConversation()}
                  accessibilityRole="button"
                  accessibilityLabel="Start new conversation"
                  hitSlop={8}
                >
                  <ArrowCounterClockwise size={18} color={colors.textSecondary} weight="bold" />
                </Pressable>
              ) : null}

              <Pressable
                style={styles.closeBtn}
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="End session"
                hitSlop={12}
              >
                <X size={22} color={colors.textSecondary} weight="bold" />
              </Pressable>
            </View>
          </View>

          {/* Voice status indicator — tappable when AI is speaking to interrupt */}
          <Pressable
            style={styles.statusBar}
            onPress={status === 'ai_speaking' ? interruptAi : undefined}
            accessibilityRole={status === 'ai_speaking' ? 'button' : undefined}
            accessibilityLabel={status === 'ai_speaking' ? 'Tap to interrupt' : undefined}
          >
            <VoiceIndicator status={status} isPaused={isPaused} />
            {status === 'ai_speaking' ? (
              <Text style={styles.interruptHint}>tap to interrupt</Text>
            ) : null}
          </Pressable>

          {/* Transcript + suggestions */}
          {listData.length === 0 ? (
            <View style={styles.emptyState}>
              {status === 'connecting' ? (
                <ActivityIndicator color={colors.primary} />
              ) : error ? (
                <View style={styles.errorState}>
                  <Warning size={32} color={colors.danger} weight="fill" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <View style={styles.hintWrap}>
                  <MotiView
                    from={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 16 }}
                    style={styles.micHint}
                  >
                    <Microphone size={40} color={colors.primary} weight="duotone" />
                  </MotiView>
                  <Text style={styles.hintTitle}>Start talking</Text>
                  <Text style={styles.hintBody}>
                    Tell Tend what needs doing for your circle — tasks, reminders, routines.
                    It will suggest them for you to confirm.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={listData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + spacing[4] },
              ]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {/* Circle chips — quick context selector */}
          {sessionCircles.length > 1 && (
            <View style={[styles.circleStrip, { paddingBottom: insets.bottom || spacing[5] }]}>
              <CircleChips circles={sessionCircles} onSelect={handleCircleSelect} />
            </View>
          )}
        </View>
      </Modal>

      {/* TaskEntryModal for editing an AI suggestion */}
      {editState ? (
        <TaskEntryModal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          circles={circles}
          initialCircleId={editState.circleId}
        />
      ) : null}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { gap: 2, flex: 1 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  headerBtn: {
    padding: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBtnActive: {
    backgroundColor: colors.accentBg,
    borderColor: colors.primary,
  },
  closeBtn: {
    padding: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Status bar
  statusBar: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interruptHint: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    opacity: 0.7,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  indicatorIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorText: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
  },
  indicatorTextMuted: {
    color: colors.textMuted,
  },

  // Empty / loading state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  errorState: {
    alignItems: 'center',
    gap: spacing[3],
  },
  errorText: {
    fontSize: 17,
    fontFamily: 'OpenSans_400Regular',
    color: colors.danger,
    textAlign: 'center',
  },
  hintWrap: {
    alignItems: 'center',
    gap: spacing[4],
  },
  micHint: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintTitle: {
    fontSize: 22,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  hintBody: {
    fontSize: 17,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Transcript
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  transcriptRow: {
    alignItems: 'flex-start',
  },
  transcriptRowUser: {
    alignItems: 'flex-end',
  },
  transcriptBubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
  },
  bubbleText: {
    fontSize: 17,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
    lineHeight: 24,
  },
  bubbleTextUser: {
    color: colors.textInverse,
  },

  // Suggestion cards
  suggestionCard: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  suggestionCardDone: {
    backgroundColor: colors.surface,
    opacity: 0.8,
  },
  suggestionCardDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  suggestionDoneText: {
    fontSize: 17,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.success,
    flex: 1,
  },
  suggestionDismissedText: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionLabel: {
    fontSize: 12,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionCircle: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  suggestionTitle: {
    fontSize: 19,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  suggestionDesc: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  suggestionMeta2Row: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  suggestionMeta: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  suggestionSkip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  suggestionSkipText: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
  },
  suggestionEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  suggestionEditText: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
  },
  suggestionAdd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
  },
  suggestionAddText: {
    fontSize: 16,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textInverse,
  },

  // Circle chips
  circleStrip: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing[3],
  },
  circleChipsWrap: {
    gap: spacing[2],
    paddingHorizontal: spacing[5],
  },
  circleChipsLabel: {
    fontSize: 13,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
  },
  circleChipsRow: {
    gap: spacing[2],
    paddingRight: spacing[5],
  },
  circleChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  circleChipText: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
});
