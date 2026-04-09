/**
 * Bottom-sheet style form to create a concern (title, description, optional due, optional plan).
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import type { ApiResponse, Circle, Plan } from '@care/shared/types';
import { api } from '@/lib/api';
import { useCirclesStore } from '@/store/circles.store';
import { DueDateTimeSection } from '@/components/DueDateTimeSection';
import { FormSheetModal, formSheetScrollMaxHeight } from '@/components/FormSheetModal';

export function ConcernEntryModal({
  visible,
  onDismiss,
  circles,
  initialCircleId,
}: {
  visible: boolean;
  onDismiss: () => void;
  circles: Circle[];
  initialCircleId: string | null;
}) {
  const createConcern = useCirclesStore((s) => s.createConcern);

  const [selectedCircleId, setSelectedCircleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTitle('');
    setDescription('');
    setDueAt(null);
    setPlanId(null);
    const pick =
      (initialCircleId && circles.some((c) => c.id === initialCircleId) ? initialCircleId : null) ??
      circles[0]?.id ??
      '';
    setSelectedCircleId(pick);
  }, [visible, initialCircleId, circles]);

  useEffect(() => {
    if (!visible || !selectedCircleId) {
      setPlans([]);
      return;
    }
    setPlanId(null);
    let cancelled = false;
    setPlansLoading(true);
    api
      .get<ApiResponse<Plan[]>>(`/circles/${selectedCircleId}/plans`)
      .then((res) => {
        if (!cancelled) setPlans(res.data);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, selectedCircleId]);

  const onSave = useCallback(async () => {
    const t = title.trim();
    if (!t || !selectedCircleId) return;

    const dueAtIso = dueAt ? dueAt.toISOString() : undefined;

    setSaving(true);
    setError(null);
    try {
      await createConcern(selectedCircleId, {
        title: t,
        description: description.trim() || undefined,
        dueAt: dueAtIso,
        planId: planId ?? undefined,
      });
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save concern.');
    } finally {
      setSaving(false);
    }
  }, [title, description, dueAt, planId, selectedCircleId, createConcern, onDismiss]);

  const selectedCircle = circles.find((c) => c.id === selectedCircleId);

  return (
    <FormSheetModal visible={visible} onDismiss={onDismiss}>
      <Text style={styles.modalTitle}>New concern</Text>
      <Text style={styles.modalHint}>
        Something time-sensitive the circle should not lose track of.
      </Text>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: formSheetScrollMaxHeight() }}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {circles.length > 1 ? (
          <View style={styles.field}>
            <Text style={styles.label}>Circle</Text>
            <View style={styles.chips}>
              {circles.map((c) => {
                const on = c.id === selectedCircleId;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setSelectedCircleId(c.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : selectedCircle ? (
          <Text style={styles.singleCircle}>Circle: {selectedCircle.name}</Text>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What needs attention?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Details (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Context, links, next step…"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <DueDateTimeSection value={dueAt} onChange={setDueAt} />

        <View style={styles.field}>
          <Text style={styles.label}>Link to plan (optional)</Text>
          {plansLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.plansSpinner} />
          ) : plans.length === 0 ? (
            <Text style={styles.muted}>No plans in this circle yet.</Text>
          ) : (
            <View style={styles.planList}>
              <Pressable
                style={[styles.planRow, planId === null && styles.planRowOn]}
                onPress={() => setPlanId(null)}
                accessibilityRole="radio"
                accessibilityState={{ checked: planId === null }}
              >
                <Text style={[styles.planRowText, planId === null && styles.planRowTextOn]}>None</Text>
              </Pressable>
              {plans.map((p) => {
                const on = planId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.planRow, on && styles.planRowOn]}
                    onPress={() => setPlanId(p.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[styles.planRowText, on && styles.planRowTextOn]} numberOfLines={2}>
                      {p.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={onDismiss} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, (!title.trim() || !selectedCircleId || saving) && styles.saveBtnOff]}
          disabled={!title.trim() || !selectedCircleId || saving}
          onPress={onSave}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Add concern'}</Text>
        </Pressable>
      </View>
    </FormSheetModal>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
    fontSize: 20,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  modalHint: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    marginBottom: spacing[1],
  },
  field: { gap: spacing[1], marginBottom: spacing[3] },
  label: {
    fontSize: 12,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textSecondary,
  },
  input: {
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
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: '100%',
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.accentBg,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  chipTextOn: { color: colors.primary },
  singleCircle: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  muted: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  plansSpinner: { alignSelf: 'flex-start', marginVertical: spacing[2] },
  planList: { gap: spacing[2] },
  planRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
  },
  planRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.accentBg,
  },
  planRowText: {
    fontSize: 15,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
  planRowTextOn: { fontFamily: 'OpenSans_600SemiBold', color: colors.primary },
  error: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.concern,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[2] },
  cancelBtn: { paddingVertical: spacing[3], paddingHorizontal: spacing[4] },
  cancelText: { fontSize: 16, fontFamily: 'OpenSans_600SemiBold', color: colors.textMuted },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  saveBtnOff: { opacity: 0.5 },
  saveText: { fontSize: 16, fontFamily: 'OpenSans_600SemiBold', color: colors.textInverse },
});
