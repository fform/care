/**
 * Bottom-sheet form to create a task (title, description, optional due, plan, concern, optional recurrence).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Plus, X } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import type { ApiResponse, Circle, Concern, PaginatedResponse, Plan } from '@care/shared/types';
import { api } from '@/lib/api';
import { useCirclesStore } from '@/store/circles.store';
import { DueDateTimeSection } from '@/components/DueDateTimeSection';
import { FormSheetModal, formSheetScrollMaxHeight } from '@/components/FormSheetModal';

function normalizeSlotTime(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function TaskEntryModal({
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
  const createTask = useCirclesStore((s) => s.createTask);

  const [selectedCircleId, setSelectedCircleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [concernId, setConcernId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [concernsLoading, setConcernsLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [slotTimes, setSlotTimes] = useState<string[]>(['09:00']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTitle('');
    setDescription('');
    setDueAt(null);
    setPlanId(null);
    setConcernId(null);
    setIsRecurring(false);
    setSlotTimes(['09:00']);
    const pick =
      (initialCircleId && circles.some((c) => c.id === initialCircleId) ? initialCircleId : null) ??
      circles[0]?.id ??
      '';
    setSelectedCircleId(pick);
  }, [visible, initialCircleId, circles]);

  useEffect(() => {
    if (!visible || !selectedCircleId) {
      setPlans([]);
      setConcerns([]);
      return;
    }
    setPlanId(null);
    setConcernId(null);
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

    setConcernsLoading(true);
    api
      .get<PaginatedResponse<Concern>>(`/circles/${selectedCircleId}/concerns`)
      .then((res) => {
        if (!cancelled) {
          setConcerns(res.data.filter((c) => !c.resolvedAt));
        }
      })
      .catch(() => {
        if (!cancelled) setConcerns([]);
      })
      .finally(() => {
        if (!cancelled) setConcernsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, selectedCircleId]);

  const addSlot = useCallback(() => {
    setSlotTimes((prev) => [...prev, '12:00']);
  }, []);

  const removeSlot = useCallback((index: number) => {
    setSlotTimes((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const setSlotAt = useCallback((index: number, value: string) => {
    setSlotTimes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const onSave = useCallback(async () => {
    const t = title.trim();
    if (!t || !selectedCircleId) return;

    const dueAtIso = dueAt ? dueAt.toISOString() : undefined;

    let recurrenceSlotTimes: string[] | undefined;
    if (isRecurring) {
      const normalized: string[] = [];
      for (const raw of slotTimes) {
        const n = normalizeSlotTime(raw);
        if (!n) {
          setError('Each repeat time must be HH:MM (e.g. 08:00 or 17:30).');
          return;
        }
        normalized.push(n);
      }
      if (normalized.length === 0) {
        setError('Add at least one daily time for repeating tasks.');
        return;
      }
      recurrenceSlotTimes = normalized;
    }

    setSaving(true);
    setError(null);
    try {
      await createTask(selectedCircleId, {
        title: t,
        description: description.trim() || undefined,
        dueAt: dueAtIso,
        planId: planId ?? undefined,
        concernId: concernId ?? undefined,
        isRecurring: isRecurring || undefined,
        recurrenceSlotTimes,
      });
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save task.');
    } finally {
      setSaving(false);
    }
  }, [
    title,
    description,
    dueAt,
    planId,
    concernId,
    isRecurring,
    slotTimes,
    selectedCircleId,
    createTask,
    onDismiss,
  ]);

  const selectedCircle = circles.find((c) => c.id === selectedCircleId);

  return (
    <FormSheetModal visible={visible} onDismiss={onDismiss}>
      <Text style={styles.modalTitle}>New task</Text>
      <Text style={styles.modalHint}>A concrete to-do — one-off or repeating (like feedings).</Text>

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
            placeholder="What needs doing?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Details (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Notes, links…"
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
            <ActivityIndicator color={colors.primary} style={styles.inlineSpinner} />
          ) : plans.length === 0 ? (
            <Text style={styles.muted}>No plans in this circle yet.</Text>
          ) : (
            <View style={styles.planList}>
              <Pressable
                style={[styles.planRow, planId === null && styles.planRowOn]}
                onPress={() => setPlanId(null)}
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

        <View style={styles.field}>
          <Text style={styles.label}>Link to concern (optional)</Text>
          {concernsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.inlineSpinner} />
          ) : concerns.length === 0 ? (
            <Text style={styles.muted}>No open concerns in this circle.</Text>
          ) : (
            <View style={styles.planList}>
              <Pressable
                style={[styles.planRow, concernId === null && styles.planRowOn]}
                onPress={() => setConcernId(null)}
              >
                <Text style={[styles.planRowText, concernId === null && styles.planRowTextOn]}>
                  None
                </Text>
              </Pressable>
              {concerns.map((c) => {
                const on = concernId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.planRow, on && styles.planRowOn]}
                    onPress={() => setConcernId(c.id)}
                  >
                    <Text style={[styles.planRowText, on && styles.planRowTextOn]} numberOfLines={2}>
                      {c.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.field, styles.recurRow]}>
          <View style={styles.recurLabelBlock}>
            <Text style={styles.label}>Repeats daily</Text>
            <Text style={styles.mutedSmall}>Complete each time slot from Today.</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border, true: colors.accentBg }}
            thumbColor={isRecurring ? colors.primary : colors.surface}
          />
        </View>

        {isRecurring ? (
          <View style={styles.field}>
            <Text style={styles.label}>Times (24h)</Text>
            {slotTimes.map((slot, index) => (
              <View key={index} style={styles.slotRow}>
                <TextInput
                  style={[styles.input, styles.slotInput]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                  value={slot}
                  onChangeText={(v) => setSlotAt(index, v)}
                  autoCapitalize="none"
                />
                <Pressable
                  style={styles.slotRemove}
                  onPress={() => removeSlot(index)}
                  disabled={slotTimes.length <= 1}
                  accessibilityLabel="Remove time"
                >
                  <X
                    size={20}
                    color={slotTimes.length <= 1 ? colors.border : colors.textMuted}
                    weight="bold"
                  />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addSlot} onPress={addSlot}>
              <Plus size={18} color={colors.primary} weight="bold" />
              <Text style={styles.addSlotText}>Add time</Text>
            </Pressable>
          </View>
        ) : null}
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
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Add task'}</Text>
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
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
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
  mutedSmall: {
    fontSize: 11,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  inlineSpinner: { alignSelf: 'flex-start', marginVertical: spacing[2] },
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
  recurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  recurLabelBlock: { flex: 1, minWidth: 0 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  slotInput: { flex: 1 },
  slotRemove: { padding: spacing[2] },
  addSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
    paddingVertical: spacing[1],
  },
  addSlotText: {
    fontSize: 15,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
  },
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
