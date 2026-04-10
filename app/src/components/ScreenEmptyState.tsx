import type { ComponentType } from 'react';
import { View, StyleSheet } from 'react-native';
import type { IconProps } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing } from '@care/shared/theme';

type Props = {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
  testID?: string;
};

/**
 * Empty / zero-data block: large icon treatment + copy (Pencil uses illustration + suggestion, not a bare line of text).
 */
export function ScreenEmptyState({ icon: Icon, title, body, testID }: Props) {
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="text" accessibilityLabel={`${title}. ${body}`}>
      <View style={styles.illustration}>
        <View style={styles.iconRing}>
          <Icon size={40} color={colors.primary} weight="duotone" />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  illustration: {
    marginBottom: spacing[2],
  },
  iconRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: 18,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
});
