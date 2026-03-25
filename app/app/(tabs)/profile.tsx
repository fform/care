import { View, StyleSheet, Pressable } from 'react-native';
import { SignOut } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Text, Card, Button } from '@care/shared/components';
import { colors, spacing } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <Text variant="headingLarge">You</Text>
      {user && (
        <Card padding={5} style={styles.card}>
          <Text variant="headingSmall">{user.name}</Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {user.email}
          </Text>
        </Card>
      )}
      <Button
        label="Sign out"
        variant="ghost"
        onPress={handleLogout}
        icon={<SignOut size={16} color={colors.concern} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing[6],
    paddingTop: spacing[16],
    gap: spacing[4],
  },
  card: { marginTop: spacing[2] },
});
