import { View, StyleSheet } from 'react-native';
import { Text } from '@care/shared/components';
import { colors, spacing } from '@care/shared/theme';

export default function CirclesScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headingLarge">Circles</Text>
      <Text variant="bodyMedium" color={colors.textSecondary}>
        Your care circles will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing[6],
    paddingTop: spacing[16],
    gap: spacing[2],
  },
});
