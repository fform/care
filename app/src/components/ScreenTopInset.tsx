import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@care/shared/theme';

/**
 * Tab screens: use native safe-area padding for the top edge. Manual `paddingTop` from
 * `useSafeAreaInsets()` is often **too small** inside nested navigators (tabs in stack),
 * which clips large header text under the status bar / Dynamic Island.
 */
export function ScreenTopInset({ children, style, ...rest }: ViewProps) {
  return (
    <SafeAreaView {...rest} style={[styles.root, style]} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
