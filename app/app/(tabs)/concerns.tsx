/**
 * Concerns screen — Active concerns and all tasks across circles
 */
import { useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Warning, CheckCircle } from 'phosphor-react-native';
import { Text } from '@care/shared/components';
import { colors, spacing, radius } from '@care/shared/theme';

const FILTER_TABS = ['All Tasks', 'Today', 'Assigned to Me', 'Complete'];

const MOCK_CONCERNS = [
  { id: '1', circle: "Mom's Care", text: 'Prescription refill due Apr 3' },
  { id: '2', circle: 'Buster', text: 'Buster needs flea medication this week' },
];

const MOCK_TASK_GROUPS = [
  {
    id: 'meals',
    groupName: 'Meals & Groceries',
    count: 4,
    tasks: [
      { id: '1', title: 'Pick up groceries for Mom', due: 'Today, 4pm', assignee: 'Assigned to you', done: false, unassigned: false },
      { id: '2', title: 'Prep Tuesday meals', due: 'Tomorrow', assignee: 'Done by David · 2h ago', done: true, unassigned: false },
      { id: '3', title: "Order Mom's favorite tea online", due: 'Tomorrow', assignee: 'Assigned to Lisa', done: false, unassigned: false },
      { id: '4', title: 'Refill water filter pitcher', due: 'This week', assignee: 'Unassigned', done: false, unassigned: true },
    ],
  },
  {
    id: 'house',
    groupName: 'House Maintenance',
    count: 2,
    tasks: [
      { id: '5', title: 'Fix leaky kitchen faucet', due: 'This week', assignee: 'Assigned to David', done: false, unassigned: false },
      { id: '6', title: 'Replace smoke detector batteries', due: 'Next Monday', assignee: 'Assigned to you', done: false, unassigned: false },
    ],
  },
];

export default function ConcernsScreen() {
  const [activeFilter, setActiveFilter] = useState('All Tasks');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Plans & Tasks</Text>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTER_TABS.map((tab) => (
              <Pressable
                key={tab}
                style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab)}
              >
                <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Concerns */}
        {MOCK_CONCERNS.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, delay: 60 }}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>Active Concerns</Text>
            {MOCK_CONCERNS.map((c) => (
              <View key={c.id} style={styles.concernCard}>
                <Warning size={18} color={colors.warning} weight="fill" />
                <View style={styles.concernContent}>
                  <Text style={styles.concernText}>{c.text}</Text>
                  <Text style={styles.concernCircle}>{c.circle}</Text>
                </View>
              </View>
            ))}
          </MotiView>
        )}

        {/* Task groups */}
        {MOCK_TASK_GROUPS.map((group, gi) => (
          <MotiView
            key={group.id}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, delay: 120 + gi * 60 }}
            style={styles.section}
          >
            <View style={styles.groupHeader}>
              <Text style={styles.sectionLabel}>{group.groupName}</Text>
              <Text style={styles.groupCount}>{group.count} tasks</Text>
            </View>

            <View style={styles.taskList}>
              {group.tasks.map((task, ti) => (
                <View
                  key={task.id}
                  style={[styles.taskRow, ti < group.tasks.length - 1 && styles.taskRowBorder]}
                >
                  <View style={[styles.taskCheck, task.done && styles.taskCheckDone]}>
                    {task.done && <CheckCircle size={22} color={colors.success} weight="fill" />}
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskMeta}>
                      {task.due}
                      {task.unassigned ? (
                        <Text style={styles.unassigned}> · Unassigned</Text>
                      ) : (
                        <Text style={styles.taskAssignee}> · {task.assignee}</Text>
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </MotiView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingBottom: spacing[10],
  },

  header: {
    padding: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
  },
  title: {
    fontSize: 26,
    fontFamily: 'OpenSans_700Bold',
    color: colors.textPrimary,
  },

  filterBar: {
    backgroundColor: colors.background,
    paddingBottom: spacing[3],
  },
  filters: {
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  filterTabTextActive: {
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textInverse,
  },

  section: { paddingHorizontal: spacing[5], gap: spacing[3] },

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
  concernContent: { flex: 1, gap: 2 },
  concernText: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
  concernCircle: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupCount: {
    fontSize: 13,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },

  taskList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
  },
  taskRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckDone: {
    borderWidth: 0,
  },
  taskContent: { flex: 1, gap: 3 },
  taskTitle: {
    fontSize: 14,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textPrimary,
  },
  taskTitleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    fontSize: 12,
    fontFamily: 'OpenSans_400Regular',
    color: colors.textMuted,
  },
  taskAssignee: {
    color: colors.textMuted,
  },
  unassigned: {
    color: colors.warning,
    fontFamily: 'OpenSans_600SemiBold',
  },
});
