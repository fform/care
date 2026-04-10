import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { UsersThree } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import type { CreateFromTemplateInput } from '@/store/circles.store';

type Props = {
  onCreateFromTemplate: (input: CreateFromTemplateInput) => Promise<void>;
  busy: boolean;
};

const COPY: Record<
  CreateFromTemplateInput['template'],
  { label: string; hint: string }
> = {
  loved_one: { label: 'Caring for a loved one', hint: 'Med schedules, appointments, siblings' },
  kid: { label: 'Caring for kids', hint: 'School, activities, handoffs' },
  pet: { label: 'Caring for a pet', hint: 'Vet visits, meds, walks & feeding' },
};

export function TemplateEmptyState({ onCreateFromTemplate, busy }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero} accessibilityRole="image" accessibilityLabel="Care circle illustration">
        <View style={styles.heroRing}>
          <UsersThree size={44} color={colors.primary} weight="duotone" />
        </View>
      </View>
      <Text style={styles.lead}>
        A <Text style={styles.bold}>circle</Text> is your shared space for everyone helping with care.
        Pick a starter — we’ll add a few tasks and concerns you can edit.
      </Text>

      <Text style={styles.label}>Circle name</Text>
      <TemplateForm
        busy={busy}
        onSubmit={onCreateFromTemplate}
      />
    </View>
  );
}

function TemplateForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (input: CreateFromTemplateInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [heartName, setHeartName] = useState('');
  const [template, setTemplate] = useState<CreateFromTemplateInput['template']>('loved_one');

  const submit = async () => {
    if (!name.trim() || !heartName.trim()) return;
    await onSubmit({
      template,
      name: name.trim(),
      heartName: heartName.trim(),
    });
  };

  return (
    <View style={styles.form}>
      {(Object.keys(COPY) as CreateFromTemplateInput['template'][]).map((key) => (
        <Pressable
          key={key}
          style={[styles.templateChip, template === key && styles.templateChipOn]}
          onPress={() => setTemplate(key)}
        >
          <Text style={[styles.templateLabel, template === key && styles.templateLabelOn]}>
            {COPY[key].label}
          </Text>
          <Text style={styles.templateHint}>{COPY[key].hint}</Text>
        </Pressable>
      ))}

      <TextInput
        style={styles.input}
        placeholder="e.g. Mom’s care team"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        editable={!busy}
      />
      <TextInput
        style={styles.input}
        placeholder="Who is at the center? (name)"
        placeholderTextColor={colors.textMuted}
        value={heartName}
        onChangeText={setHeartName}
        editable={!busy}
      />

      <Pressable
        style={[styles.cta, (!name.trim() || !heartName.trim() || busy) && styles.ctaDisabled]}
        onPress={submit}
        disabled={!name.trim() || !heartName.trim() || busy}
      >
        <Text style={styles.ctaText}>{busy ? 'Creating…' : 'Create circle'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[4], paddingBottom: spacing[6] },
  hero: { alignItems: 'center', marginBottom: spacing[2] },
  heroRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lead: {
    fontSize: 19,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bold: { fontFamily: 'OpenSans_600SemiBold', color: colors.textPrimary },
  label: {
    fontSize: 17,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  form: { gap: spacing[3] },
  templateChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing[3],
    backgroundColor: colors.surface,
  },
  templateChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.accentBg,
  },
  templateLabel: {
    fontSize: 19,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  templateLabelOn: { color: colors.primary },
  templateHint: {
    fontSize: 16,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 19,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: {
    fontSize: 20,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textInverse,
  },
});
