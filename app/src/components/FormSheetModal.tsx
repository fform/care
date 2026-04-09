/**
 * Full-screen dim + bottom sheet with: overlay fade (Moti), sheet slide-up (Moti),
 * flex-end anchoring (no absolute gap). Keyboard: use ScrollView automaticallyAdjustKeyboardInsets
 * inside the sheet — avoid wrapping the whole sheet in KeyboardAvoidingView (double-adjust + gaps).
 */
import type { ReactNode } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { View as MotiView } from 'moti/build/components/view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@care/shared/theme';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

/** Reserve space for title, hint, errors, actions below the scroll region. */
const SHEET_CHROME = 220;

/** Max height for a ScrollView inside the sheet so the card stays within ~92% window. */
export function formSheetScrollMaxHeight(): number {
  return Math.max(160, Math.round(WINDOW_HEIGHT * 0.92 - SHEET_CHROME));
}

type Props = {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
};

export function FormSheetModal({ visible, onDismiss, children }: Props) {
  const insets = useSafeAreaInsets();
  const maxCardH = Math.round(WINDOW_HEIGHT * 0.92);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onDismiss}>
      <View style={styles.root} accessibilityViewIsModal>
        <MotiView
          style={StyleSheet.absoluteFillObject}
          pointerEvents="box-none"
          from={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ type: 'timing', duration: 220 }}
        >
          <Pressable
            style={styles.backdropPress}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
        </MotiView>

        <View style={styles.sheetColumn} pointerEvents="box-none">
          <MotiView
            from={{ translateY: Math.min(520, WINDOW_HEIGHT * 0.55) }}
            animate={{ translateY: visible ? 0 : Math.min(520, WINDOW_HEIGHT * 0.55) }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.sheetMoti}
          >
            <View
              style={[
                styles.card,
                {
                  maxHeight: maxCardH,
                  paddingBottom: spacing[4] + Math.max(insets.bottom, spacing[2]),
                },
              ]}
            >
              {children}
            </View>
          </MotiView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetColumn: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  sheetMoti: {
    width: '100%',
  },
  card: {
    width: '100%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    gap: spacing[2],
  },
});
