/**
 * Today screen — Daily Brief
 * "What do I need to care about right now?"
 */
import { useEffect } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { Warning, User } from 'phosphor-react-native';
import { colors, spacing, radius } from '@care/shared/theme';
import { useAuthStore } from '@/store/auth.store';
import { useCirclesStore } from '@/store/circles.store';
import { useNavigationStore } from '@/store/navigation.store';
import { Text } from '@care/shared/components';

const MOCK_CONCERNS = [
  { id: '1', text: "Mom's prescription runs out in 3 days" },
  { id: '2', text: 'Buster needs flea medication this week' },
];

const MOCK_TASKS = [
  { id: '1', title: 'Drive Mom to Dr. Chen at 2pm', meta: 'Today · Assigned to you' },
  { id: '2', title: 'Pick up groceries for Dad', meta: 'Today · Assigned to you' },
  { id: '3', title: 'Feed Buster evening meds', meta: 'Today · Assigned to you' },
];

const MOCK_UPDATES = [
  { id: '1', color: '#D4916E', text: "Jake picked up Mom's dry cleaning" },
  { id: '2', color: '#B8724F', text: 'Alex walked Buster this morning' },
];

export default function TodayScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const setFocusedCircleId = useNavigationStore((s) => s.setFocusedCircleId);
  const { fetchCircles, fetchTasks } = useCirclesStore();

  useEffect(() => {
    fetchCircles();
  }, []);

  useEffect(() => {
    if (focusedCircleId) {
      fetchTasks(focusedCircleId);
    }
  }, [focusedCircleId]);

  const firstName = user?.name?.split(' ')[0] ?? 'Sarah';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
              <Text style={styles.date}>{formatDate(new Date())}</Text>
            </View>
            <View style={styles.headerActions}>
              {focusedCircleId ? (
                <Pressable
                  onPress={() => setFocusedCircleId(null)}
                  style={styles.exitFocus}
                  accessibilityRole="button"
                >
                  <Text style={styles.exitFocusText}>All circles</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                hitSlop={12}
              >
                <User size={24} color={colors.textPrimary} weight="duotone" />
              </Pressable>
            </View>
          </View>
        </MotiView>

        {/* Concerns */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 60 }}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>Concerns</Text>
          {MOCK_CONCERNS.map((c) => (
            <View key={c.id} style={styles.concernCard}>
              <Warning size={18} color={colors.warning} weight="fill" />
              <Text style={styles.concernText}>{c.text}</Text>
            </View>
          ))}
        </MotiView>

        {/* Tasks Today */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 120 }}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>Your Tasks Today</Text>
          {MOCK_TASKS.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={styles.checkbox} />
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>{task.meta}</Text>
              </View>
            </View>
          ))}
        </MotiView>

        {/* Circle Updates */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 180 }}
          style={styles.section}
        >
          <Text style={styles.sectionLabel}>Circle Updates</Text>
          {MOCK_UPDATES.map((update) => (
            <View key={update.id} style={styles.updateRow}>
              <View style={[styles.updateAvatar, { backgroundColor: update.color }]} />
              <Text style={styles.updateText}>{update.text}</Text>
            </View>
          ))}
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: spacing[5],
    paddingTop: spacing[6],
    gap: spacing[7],
    paddingBottom: spacing[10],
  },

  header: { gap: spacing[1] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerText: { flex: 1, gap: spacing[1] },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  exitFocus: {
    paddingVertical: 6,
    paddingHorizontal: spacing[3],
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exitFocusText: {
    fontSize: 12,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.secondary,
  },
  greeting: {
    fontSize: 26,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
    lineHeight: 34,
  },
  date: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },

  section: { gap: spacing[3] },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },

  concernCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  concernText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },

  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 1,
  },
  taskContent: { flex: 1, gap: 2 },
  taskTitle: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
  taskMeta: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },

  updateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  updateAvatar: { width: 32, height: 32, borderRadius: 16, flexShrink: 0 },
  updateText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
});
