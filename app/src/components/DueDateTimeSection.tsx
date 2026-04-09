/**
 * Due date + time using native pickers (@expo/ui) on iOS/Android; web uses text fallback.
 */
import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@expo/ui/datetimepicker';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';

function defaultAtNine(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

/** New calendar day + keep existing clock, or 9:00 if no prior value. */
function mergeDatePart(prev: Date | null, picked: Date): Date {
  const next = new Date(picked);
  if (prev) {
    next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
  } else {
    next.setHours(9, 0, 0, 0);
  }
  return next;
}

function mergeTimePart(base: Date, picked: Date): Date {
  const next = new Date(base);
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

function WebDueFallback({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (next: Date | null) => void;
}) {
  const [dateStr, setDateStr] = useState(() =>
    value ? value.toISOString().slice(0, 10) : ''
  );
  const [timeStr, setTimeStr] = useState(() => {
    if (!value) return '';
    const h = value.getHours();
    const m = value.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (value) {
      setDateStr(value.toISOString().slice(0, 10));
      const h = value.getHours();
      const m = value.getMinutes();
      setTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    } else {
      setDateStr('');
      setTimeStr('');
    }
  }, [value]);

  useEffect(() => {
    const dTrim = dateStr.trim();
    const tTrim = timeStr.trim();
    if (!dTrim) {
      onChange(null);
      return;
    }
    if (!DATE_RE.test(dTrim)) return;
    if (tTrim && !TIME_RE.test(tTrim)) return;
    const merged = new Date(`${dTrim}T${tTrim || '09:00'}:00`);
    if (!Number.isNaN(merged.getTime())) onChange(merged);
  }, [dateStr, timeStr, onChange]);

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Due date (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          value={dateStr}
          onChangeText={setDateStr}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Due time (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:MM (24h)"
          placeholderTextColor={colors.textMuted}
          value={timeStr}
          onChangeText={setTimeStr}
          autoCapitalize="none"
        />
      </View>
    </>
  );
}

export function DueDateTimeSection({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (next: Date | null) => void;
}) {
  const [androidPicker, setAndroidPicker] = useState<'date' | 'time' | null>(null);
  const [iosPicker, setIosPicker] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState(() => value ?? defaultAtNine());

  const openDate = () => {
    const nextDraft = value ?? defaultAtNine();
    setDraft(nextDraft);
    if (Platform.OS === 'android') {
      setAndroidPicker('date');
    } else {
      setIosPicker('date');
    }
  };

  const openTime = () => {
    if (!value) return;
    setDraft(value);
    if (Platform.OS === 'android') {
      setAndroidPicker('time');
    } else {
      setIosPicker('time');
    }
  };

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (Platform.OS === 'web') {
    return <WebDueFallback value={value} onChange={onChange} />;
  }

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Due date (optional)</Text>
        <Pressable style={styles.inputLike} onPress={openDate}>
          <Text style={value ? styles.inputLikeText : styles.inputLikePlaceholder}>
            {value ? fmtDate(value) : 'Tap to choose a day'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, !value && styles.labelMuted]}>Due time (optional)</Text>
        <Pressable
          style={[styles.inputLike, !value && styles.inputLikeDisabled]}
          onPress={openTime}
          disabled={!value}
        >
          <Text
            style={
              value ? styles.inputLikeText : [styles.inputLikePlaceholder, styles.labelMuted]
            }
          >
            {value ? fmtTime(value) : 'Pick a date first'}
          </Text>
        </Pressable>
      </View>

      {value ? (
        <Pressable onPress={() => onChange(null)} hitSlop={8}>
          <Text style={styles.clear}>Clear due date & time</Text>
        </Pressable>
      ) : null}

      {Platform.OS === 'android' && androidPicker === 'date' ? (
        <DateTimePicker
          value={draft}
          mode="date"
          presentation="dialog"
          accentColor={colors.primary}
          onValueChange={(_, d) => {
            onChange(mergeDatePart(value, d));
            setAndroidPicker(null);
          }}
          onDismiss={() => setAndroidPicker(null)}
        />
      ) : null}

      {Platform.OS === 'android' && androidPicker === 'time' && value ? (
        <DateTimePicker
          value={value}
          mode="time"
          presentation="dialog"
          accentColor={colors.primary}
          is24Hour={undefined}
          onValueChange={(_, d) => {
            onChange(mergeTimePart(value, d));
            setAndroidPicker(null);
          }}
          onDismiss={() => setAndroidPicker(null)}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={iosPicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setIosPicker(null)}
        >
          <View style={styles.iosModalRoot}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setIosPicker(null)}
              accessibilityLabel="Dismiss"
            />
            <View style={styles.iosModalBody} pointerEvents="box-none">
              <View style={styles.iosSheet}>
                <DateTimePicker
                  value={draft}
                  mode={iosPicker ?? 'date'}
                  display="spinner"
                  accentColor={colors.primary}
                  onValueChange={(_, d) => setDraft(d)}
                />
                <View style={styles.iosActions}>
                  <Pressable style={styles.iosBtn} onPress={() => setIosPicker(null)}>
                    <Text style={styles.iosBtnCancel}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.iosBtn}
                    onPress={() => {
                      if (iosPicker === 'date') {
                        onChange(mergeDatePart(value, draft));
                      } else if (iosPicker === 'time' && value) {
                        onChange(mergeTimePart(value, draft));
                      }
                      setIosPicker(null);
                    }}
                  >
                    <Text style={styles.iosBtnDone}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing[1], marginBottom: spacing[3] },
  label: {
    fontSize: 12,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textSecondary,
  },
  labelMuted: { color: colors.textMuted },
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
  inputLike: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  inputLikeDisabled: { opacity: 0.65 },
  inputLikeText: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
  inputLikePlaceholder: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  clear: {
    fontSize: 14,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
    marginBottom: spacing[2],
  },
  iosModalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosModalBody: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  iosSheet: {
    width: '100%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing[6],
    paddingTop: spacing[2],
  },
  iosActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  iosBtn: { paddingVertical: spacing[2], paddingHorizontal: spacing[3] },
  iosBtnCancel: {
    fontSize: 17,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
  },
  iosBtnDone: {
    fontSize: 17,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
  },
});
