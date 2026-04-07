/**
 * Circles screen — Your care circles (API-driven)
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View as MotiView } from 'moti/build/components/view';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { useCirclesStore, type CreateFromTemplateInput } from '@/store/circles.store';
import { useNavigationStore } from '@/store/navigation.store';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TemplateEmptyState } from '@/components/TemplateEmptyState';
import type { Circle, Concern, Task } from '@care/shared/types';

/** Stable fallbacks — `?? []` in selectors creates a new array each run and breaks useSyncExternalStore. */
const EMPTY_TASKS: Task[] = [];
const EMPTY_CONCERNS: Concern[] = [];

const AVATAR_COLORS = ['#D4916E', '#B8724F', '#6B9E7A', '#E8C4AE', '#6B6B6B', '#3D3D3D'];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function useCircleCounts(circleId: string) {
  const tasks = useCirclesStore((s) => s.tasks[circleId] ?? EMPTY_TASKS);
  const concerns = useCirclesStore((s) => s.concerns[circleId] ?? EMPTY_CONCERNS);
  const openConcerns = concerns.filter((c) => !c.resolvedAt).length;
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped').length;
  return { openConcerns, openTasks };
}

export default function CirclesScreen() {
  const router = useRouter();
  const setFocusedCircleId = useNavigationStore((s) => s.setFocusedCircleId);
  const circles = useCirclesStore((s) => s.circles);
  const isLoading = useCirclesStore((s) => s.isLoading);
  const fetchCircles = useCirclesStore((s) => s.fetchCircles);
  const refreshAllSummaries = useCirclesStore((s) => s.refreshAllSummaries);
  const createFromTemplate = useCirclesStore((s) => s.createFromTemplate);
  const createCircle = useCirclesStore((s) => s.createCircle);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHeart, setNewHeart] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [templateBusy, setTemplateBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchCircles();
    }, [fetchCircles])
  );

  useEffect(() => {
    if (circles.length > 0) {
      refreshAllSummaries();
    }
  }, [circles, refreshAllSummaries]);

  const onTemplateCreate = async (input: CreateFromTemplateInput) => {
    setTemplateBusy(true);
    try {
      await createFromTemplate(input);
    } finally {
      setTemplateBusy(false);
    }
  };

  const onQuickCreate = async () => {
    if (!newName.trim() || !newHeart.trim()) return;
    setCreating(true);
    try {
      await createCircle({
        name: newName.trim(),
        heartName: newHeart.trim(),
        description: newDesc.trim() || undefined,
      });
      setCreateOpen(false);
      setNewName('');
      setNewHeart('');
      setNewDesc('');
    } finally {
      setCreating(false);
    }
  };

  const showList = !isLoading && circles.length > 0;
  const showEmpty = !isLoading && circles.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            title="Your Circles"
            subtitle="Tap a circle to focus, or create a new one."
            right={
              <Pressable
                style={styles.fab}
                onPress={() => setCreateOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Create circle"
              >
                <Plus size={20} color={colors.textInverse} weight="bold" />
              </Pressable>
            }
          />

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : null}

          {showEmpty ? (
            <TemplateEmptyState onCreateFromTemplate={onTemplateCreate} busy={templateBusy} />
          ) : null}

          {showList
            ? circles.map((circle, i) => (
                <MotiView
                  key={circle.id}
                  from={{ opacity: 0, translateY: 12 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', damping: 20, delay: i * 60 }}
                >
                  <CircleCard
                    circle={circle}
                    onOpen={() => {
                      setFocusedCircleId(circle.id);
                      router.push('/');
                    }}
                  />
                </MotiView>
              ))
            : null}
        </ScrollView>

        <Modal visible={createOpen} animationType="slide" transparent>
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>New circle</Text>
              <Text style={styles.modalHint}>
                Short name for the group, and who you’re caring for.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Circle name"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Care target (e.g. Mom, Leo, Buster)"
                placeholderTextColor={colors.textMuted}
                value={newHeart}
                onChangeText={setNewHeart}
              />
              <TextInput
                style={[styles.modalInput, styles.modalInputMulti]}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
              />
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancel} onPress={() => setCreateOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSave, (!newName.trim() || !newHeart.trim() || creating) && styles.modalSaveOff]}
                  disabled={!newName.trim() || !newHeart.trim() || creating}
                  onPress={onQuickCreate}
                >
                  <Text style={styles.modalSaveText}>{creating ? 'Creating…' : 'Create'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CircleCard({ circle, onOpen }: { circle: Circle; onOpen: () => void }) {
  const { openConcerns, openTasks } = useCircleCounts(circle.id);
  const hasConcerns = openConcerns > 0;
  const { name, description, members } = circle;

  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={styles.cardTop}>
        <View style={styles.nameCol}>
          <Text style={styles.circleName} numberOfLines={2}>
            {name}
          </Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.badge, hasConcerns ? styles.badgeWarning : styles.badgeMuted]}>
            <Text style={styles.badgeText}>
              {openConcerns} concern{openConcerns === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={[styles.badge, styles.badgeTasks]}>
            <Text style={styles.badgeTextDark}>
              {openTasks} task{openTasks === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>

      {!!description && (
        <Text style={styles.circleDescription} numberOfLines={3}>
          {description}
        </Text>
      )}

      <Text style={styles.microcopy}>
        Concerns = urgent or time-sensitive. Tasks = things to check off (including repeats).
      </Text>

      <View style={styles.avatarStack}>
        {members.slice(0, 4).map((member, i) => (
          <View
            key={member.userId}
            style={[
              styles.avatarBubble,
              { backgroundColor: avatarColor(member.userId), marginLeft: i > 0 ? -10 : 0 },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  centered: { paddingVertical: spacing[10], alignItems: 'center' },

  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  nameCol: { flex: 1, minWidth: 0 },
  circleName: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  badges: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeWarning: { backgroundColor: colors.warning },
  badgeMuted: { backgroundColor: colors.border },
  badgeTasks: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.border },
  badgeText: {
    fontSize: 11,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textInverse,
  },
  badgeTextDark: {
    fontSize: 11,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  circleDescription: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  microcopy: {
    fontSize: 11,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    lineHeight: 15,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[1] },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.surface,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
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
  modalInputMulti: { minHeight: 72, textAlignVertical: 'top' },
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
