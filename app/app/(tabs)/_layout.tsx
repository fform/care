import { Tabs } from 'expo-router';
import { House, CirclesThree, CheckSquare, User } from 'phosphor-react-native';
import { colors, spacing } from '@care/shared/theme';

const TAB_ICON_SIZE = 24;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: spacing[1],
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'OpenSans_600SemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => (
            <House size={TAB_ICON_SIZE} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: 'Circles',
          tabBarIcon: ({ color }) => (
            <CirclesThree size={TAB_ICON_SIZE} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => (
            <CheckSquare size={TAB_ICON_SIZE} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color }) => (
            <User size={TAB_ICON_SIZE} color={color} weight="fill" />
          ),
        }}
      />
    </Tabs>
  );
}
