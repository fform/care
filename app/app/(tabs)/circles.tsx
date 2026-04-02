/**
 * Circles screen — Your care circles
 */
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Plus } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';
import { useCirclesStore } from '@/store/circles.store';
import type { Circle } from '@care/shared/types';

// Derive a stable color from a string (for member avatars)
const AVATAR_COLORS = ['#D4916E', '#B8724F', '#6B9E7A', '#E8C4AE', '#6B6B6B', '#3D3D3D'];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const MOCK_CIRCLES: Circle[] = [
  {
    id: '1', name: "Mom's Care", description: '3 siblings + home aide',
    heartName: 'Mom', heartAvatarUrl: null, createdAt: '', updatedAt: '',
    members: [
      { userId: 'a', circleId: '1', role: 'organizer', joinedAt: '', user: { id: 'a', name: 'Sarah', avatarUrl: null } },
      { userId: 'b', circleId: '1', role: 'caregiver', joinedAt: '', user: { id: 'b', name: 'David', avatarUrl: null } },
      { userId: 'c', circleId: '1', role: 'caregiver', joinedAt: '', user: { id: 'c', name: 'Lisa', avatarUrl: null } },
      { userId: 'd', circleId: '1', role: 'professional', joinedAt: '', user: { id: 'd', name: 'Aide', avatarUrl: null } },
    ],
  },
  {
    id: '2', name: 'The Kids', description: 'Both parents + grandma',
    heartName: 'The Kids', heartAvatarUrl: null, createdAt: '', updatedAt: '',
    members: [
      { userId: 'a', circleId: '2', role: 'organizer', joinedAt: '', user: { id: 'a', name: 'Sarah', avatarUrl: null } },
      { userId: 'e', circleId: '2', role: 'caregiver', joinedAt: '', user: { id: 'e', name: 'Tom', avatarUrl: null } },
    ],
  },
  {
    id: '3', name: 'Buster', description: 'You + Alex',
    heartName: 'Buster', heartAvatarUrl: null, createdAt: '', updatedAt: '',
    members: [
      { userId: 'a', circleId: '3', role: 'organizer', joinedAt: '', user: { id: 'a', name: 'Sarah', avatarUrl: null } },
      { userId: 'f', circleId: '3', role: 'caregiver', joinedAt: '', user: { id: 'f', name: 'Alex', avatarUrl: null } },
    ],
  },
];

// Mock concern counts (will come from API eventually)
const MOCK_CONCERN_COUNTS: Record<string, number> = { '1': 2, '2': 0, '3': 1 };

export default function CirclesScreen() {
  const storeCircles = useCirclesStore((s) => s.circles);
  const circles = storeCircles.length > 0 ? storeCircles : MOCK_CIRCLES;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Circles</Text>
          <Pressable style={styles.fab}>
            <Plus size={20} color={colors.textInverse} weight="bold" />
          </Pressable>
        </View>

        {/* Circle cards */}
        {circles.map((circle, i) => (
          <MotiView
            key={circle.id}
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, delay: i * 60 }}
          >
            <CircleCard circle={circle} concernCount={MOCK_CONCERN_COUNTS[circle.id] ?? 0} />
          </MotiView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function CircleCard({ circle, concernCount }: { circle: Circle; concernCount: number }) {
  const { name, description, members } = circle;
  const hasConcerns = concernCount > 0;

  return (
    <Pressable style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.circleName}>{name}</Text>
        <View style={[styles.badge, hasConcerns ? styles.badgeWarning : styles.badgeSuccess]}>
          <Text style={styles.badgeText}>
            {concernCount} {concernCount === 1 ? 'concern' : 'concerns'}
          </Text>
        </View>
      </View>

      {!!description && (
        <Text style={styles.circleDescription}>{description}</Text>
      )}

      <View style={styles.avatarStack}>
        {members.slice(0, 4).map((member, i) => (
          <View
            key={member.userId}
            style={[
              styles.avatarBubble,
              { backgroundColor: avatarColor(member.userId), marginLeft: i > 0 ? -10 : 0 },
            ]}
          />
        ))}
      </View>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleName: {
    fontSize: 16,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textPrimary,
  },
  circleDescription: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },

  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeWarning: { backgroundColor: colors.warning },
  badgeSuccess: { backgroundColor: colors.success },
  badgeText: {
    fontSize: 12,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textInverse,
  },

  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
