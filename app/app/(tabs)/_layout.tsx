import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Sun, CirclesThree, ChatCircle, Warning, User } from 'phosphor-react-native';
import { colors, radius, spacing } from '@care/shared/theme';

const TAB_ICON_SIZE = 18;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

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
              style={[styles.tab, isFocused && styles.tabActive]}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? colors.textInverse : colors.textMuted,
                size: TAB_ICON_SIZE,
              })}
              <Text style={[styles.label, isFocused && styles.labelActive]}>
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
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Sun size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: 'Circles',
          tabBarIcon: ({ color, size }) => <CirclesThree size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <ChatCircle size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="concerns"
        options={{
          title: 'Concerns',
          tabBarIcon: ({ color, size }) => <Warning size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} weight="fill" />,
        }}
      />
      {/* Hide old tasks tab */}
      <Tabs.Screen name="tasks" options={{ href: null }} />
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
    height: 62,
    backgroundColor: colors.surface,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 9,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.textInverse,
  },
});
