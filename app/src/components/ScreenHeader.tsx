import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@care/shared/components';
import { colors, spacing } from '@care/shared/theme';

/** Page title row — use `flex:1` + `minWidth:0` on the title block. Pair with `ScreenTopInset` (native top safe area). */
export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  title: {
    fontSize: 32,
    lineHeight: 34,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    lineHeight: 18,
  },
  left: {
    flexShrink: 0,
    paddingTop: 4,
  },
  right: {
    flexShrink: 0,
  },
});
