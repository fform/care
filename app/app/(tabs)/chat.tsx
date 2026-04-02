/**
 * Chat screen — Circle conversations
 */
import { useState } from 'react';
import { View, ScrollView, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Users, PaperPlaneTilt, CalendarBlank, Warning } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';

const MOCK_MESSAGES = [
  {
    id: '1',
    author: 'David',
    initial: 'D',
    color: '#D4916E',
    time: '10:23 AM',
    isYou: false,
    text: "Hey everyone, I spoke with Dr. Chen's office. They said Mom's blood pressure has been trending better since the medication change. They want to do a follow-up in 4 weeks.",
  },
  {
    id: '2',
    author: 'Lisa',
    initial: 'L',
    color: '#6B9E7A',
    time: '10:31 AM',
    isYou: false,
    text: "That's great news! I can drive her to the follow-up. Does it work for a Tuesday? Those work best for me.",
  },
  {
    id: '3',
    author: 'Sarah (You)',
    initial: 'S',
    color: '#B8724F',
    time: '10:35 AM',
    isYou: true,
    text: "Tuesday works! I'll add it to the plan. Also, should we ask about the knee pain she mentioned?",
  },
];

export default function ChatScreen() {
  const [message, setMessage] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mom's Care</Text>
            <Text style={styles.headerSubtitle}>Caregivers only</Text>
          </View>
          <Pressable style={styles.headerAction}>
            <Users size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Thread chip */}
        <View style={styles.threadRow}>
          <View style={styles.threadChip}>
            <Text style={styles.threadChipText}>Re: Dr. Chen appointment</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {MOCK_MESSAGES.map((msg, i) => (
            <MotiView
              key={msg.id}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 20, delay: i * 80 }}
              style={styles.message}
            >
              <View style={[styles.msgAvatar, { backgroundColor: msg.color }]}>
                <Text style={styles.msgInitial}>{msg.initial}</Text>
              </View>
              <View style={styles.msgBody}>
                <View style={styles.msgMeta}>
                  <Text style={styles.msgAuthor}>{msg.author}</Text>
                  <Text style={styles.msgTime}>{msg.time}</Text>
                </View>
                <Text style={styles.msgText}>{msg.text}</Text>
              </View>
            </MotiView>
          ))}

          {/* AI Summary Card */}
          <MotiView
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, delay: 280 }}
            style={styles.aiCard}
          >
            <View style={styles.aiHeader}>
              <Text style={styles.aiHeaderText}>✦  Tend AI Summary</Text>
            </View>
            <Text style={styles.aiBody}>
              Follow-up with Dr. Chen in 4 weeks. Lisa will drive. Added knee pain concern to next visit prep.
            </Text>
            <View style={styles.aiActions}>
              <Pressable style={styles.aiChip}>
                <CalendarBlank size={13} color={colors.primary} />
                <Text style={styles.aiChipText}>Schedule</Text>
              </Pressable>
              <Pressable style={styles.aiChip}>
                <Warning size={13} color={colors.primary} />
                <Text style={styles.aiChipText}>Add Concern</Text>
              </Pressable>
            </View>
          </MotiView>
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Message caregivers..."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
            disabled={!message.trim()}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  headerAction: { padding: spacing[1] },

  threadRow: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
  },
  threadChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  threadChipText: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.primary,
  },

  scroll: { flex: 1 },
  messages: {
    padding: spacing[5],
    gap: spacing[5],
    paddingBottom: spacing[4],
  },

  message: { flexDirection: 'row', gap: spacing[3] },
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
  msgBody: { flex: 1, gap: spacing[1] },
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

  aiCard: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center' },
  aiHeaderText: {
    fontSize: 13,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
  },
  aiBody: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  aiActions: { flexDirection: 'row', gap: spacing[2] },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  aiChipText: {
    fontSize: 12,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
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
