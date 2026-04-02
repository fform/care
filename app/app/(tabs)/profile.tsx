/**
 * Profile & Settings screen
 */
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Bell, EnvelopeSimple, ShieldCheck, CreditCard, Question, SignOut, CaretRight } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';

type IconComponent = React.ComponentType<{ size: number; color: string }>;

const SETTINGS_ROWS: { id: string; icon: IconComponent; label: string }[] = [
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'digest', icon: EnvelopeSimple, label: 'Weekly Digest' },
  { id: 'privacy', icon: ShieldCheck, label: 'Privacy & Security' },
  { id: 'subscription', icon: CreditCard, label: 'Subscription' },
];

const SUPPORT_ROWS: { id: string; icon: IconComponent; label: string }[] = [
  { id: 'help', icon: Question, label: 'Help Center' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? 'S';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={styles.profileCard}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name ?? 'Sarah Johnson'}</Text>
          <Text style={styles.userRole}>Anchor · 3 circles</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>47</Text>
              <Text style={styles.statLabel}>Tasks done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>12</Text>
              <Text style={styles.statLabel}>This week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>3</Text>
              <Text style={styles.statLabel}>Circles</Text>
            </View>
          </View>
        </MotiView>

        {/* Wellbeing nudge */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 60 }}
          style={styles.wellbeingCard}
        >
          <Text style={styles.wellbeingTitle}>♡  How are you doing?</Text>
          <Text style={styles.wellbeingBody}>
            You've completed 12 tasks this week. Remember to take time for yourself too.
          </Text>
        </MotiView>

        {/* Settings */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 120 }}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>Settings</Text>
          <View style={styles.rowCard}>
            {SETTINGS_ROWS.map((item, i) => (
              <SettingsRow
                key={item.id}
                icon={item.icon}
                label={item.label}
                showBorder={i < SETTINGS_ROWS.length - 1}
              />
            ))}
          </View>
        </MotiView>

        {/* Support */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 160 }}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.rowCard}>
            {SUPPORT_ROWS.map((item) => (
              <SettingsRow key={item.id} icon={item.icon} label={item.label} showBorder={false} />
            ))}
          </View>
        </MotiView>

        {/* Sign out */}
        <Pressable style={styles.signOutBtn} onPress={handleLogout}>
          <SignOut size={16} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  showBorder,
}: {
  icon: IconComponent;
  label: string;
  showBorder: boolean;
}) {
  return (
    <Pressable style={[styles.settingsRow, showBorder && styles.settingsRowBorder]}>
      <Icon size={20} color={colors.textMuted} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <CaretRight size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: spacing[5],
    paddingTop: spacing[6],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },

  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textInverse,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  userRole: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[6],
  },
  stat: { alignItems: 'center', gap: 2 },
  statNum: {
    fontSize: 22,
    fontFamily: 'OpenSans_700Bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  wellbeingCard: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
  },
  wellbeingTitle: {
    fontSize: 15,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.primary,
  },
  wellbeingBody: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textSecondary,
    lineHeight: 21,
  },

  section: { gap: spacing[3] },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  signOutText: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.danger,
  },
});
