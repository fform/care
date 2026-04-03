import type { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, CirclesThree, ChatCircle, Warning, CheckSquare } from 'phosphor-react-native';
import { colors, radius, spacing } from '@care/shared/theme';
import { useNavigationStore } from '@/store/navigation.store';
import { useCirclesStore } from '@/store/circles.store';

const TAB_ICON_SIZE = 18;

type TabBarProps = {
  state: {
    routes: Array<{ key: string; name: string; params?: object }>;
    index: number;
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarIcon?: (p: { focused: boolean; color: string; size: number }) => ReactNode;
      };
    }
  >;
  navigation: {
    emit: (e: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const circles = useCirclesStore((s) => s.circles);
  const focusedCircle = circles.find((c) => c.id === focusedCircleId);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.pill}>
        {state.routes.map((route: (typeof state.routes)[number], index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const isCircleModeFirst = Boolean(focusedCircleId) && route.name === 'index';
          const activeBackground =
            isFocused && isCircleModeFirst && focusedCircle
              ? focusedCircle.color
              : isFocused
                ? colors.primary
                : 'transparent';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              style={[
                styles.tab,
                isFocused && { backgroundColor: activeBackground },
              ]}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? colors.textInverse : colors.textMuted,
                size: TAB_ICON_SIZE,
              })}
              <Text
                style={[styles.label, isFocused && styles.labelActive]}
                numberOfLines={1}
              >
                {(options.title ?? route.name).toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const circles = useCirclesStore((s) => s.circles);
  const focusedCircle = circles.find((c) => c.id === focusedCircleId);

  const circleMode = Boolean(focusedCircleId);
  const indexTitle = circleMode && focusedCircle ? focusedCircle.name : 'Today';

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: indexTitle,
          tabBarIcon: ({ color, size }) =>
            circleMode && focusedCircle ? (
              <CirclesThree size={size} color={color} weight="fill" />
            ) : (
              <Sun size={size} color={color} weight="fill" />
            ),
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: 'Circles',
          tabBarIcon: ({ color, size }) => (
            <CirclesThree size={size} color={color} weight="fill" />
          ),
          href: circleMode ? null : '/circles',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <ChatCircle size={size} color={color} weight="fill" />
          ),
          href: circleMode ? '/chat' : null,
        }}
      />
      <Tabs.Screen
        name="concerns"
        options={{
          title: 'Concerns',
          tabBarIcon: ({ color, size }) => (
            <Warning size={size} color={color} weight="fill" />
          ),
          href: circleMode ? '/concerns' : null,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <CheckSquare size={size} color={color} weight="fill" />
          ),
          href: '/tasks',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 21,
    paddingTop: 12,
  },
  pill: {
    flexDirection: 'row',
    minHeight: 62,
    backgroundColor: colors.surface,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    minHeight: 54,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 8,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.textInverse,
  },
});
