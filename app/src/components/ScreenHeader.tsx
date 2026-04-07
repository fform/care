import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@care/shared/components';
import { colors, spacing } from '@care/shared/theme';

/** Page title row — use `flex:1` + `minWidth:0` on the title block. Pair with `SafeAreaView` from `react-native-safe-area-context` on the screen. */
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.row}>
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
    fontSize: 26,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
    lineHeight: 18,
  },
  right: {
    flexShrink: 0,
  },
});
