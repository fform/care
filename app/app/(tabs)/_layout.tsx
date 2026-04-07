/**
 * Tab layout — Moti sliding **circle** highlight. Selected tab: label hidden, larger icon centered in circle.
 */
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Easing } from 'react-native-reanimated';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View as MotiView } from 'moti/build/components/view';
import {
  Sun,
  Circle,
  MessageCircle,
  Flag,
  BringToFront,
} from 'lucide-react-native';
import { colors, radius } from '@care/shared/theme';
import { TAB_BAR_HIDE_ANIMATION_MS, registerTabNavigator, useNavigationStore } from '@/store/navigation.store';
import { useCirclesStore } from '@/store/circles.store';

const TAB_ICON_SIZE = 22;
const TAB_ICON_SELECTED = 27;
const ICON_STACK = Math.max(TAB_ICON_SIZE, TAB_ICON_SELECTED) + 4;
const TAB_STROKE = { active: 2.35, idle: 1.9 };

/** Fixed-size highlight — position is computed from each tab’s layout center (see `tabBarTrack`). */
const HIGHLIGHT_DIAMETER = 44;

const TAB_ROW_INNER_H = 54;

/** Subtle spring — highlight slide only (icon/label use timing so they don’t overshoot). */
const HIGHLIGHT_SPRING = {
  type: 'spring' as const,
  damping: 34,
  stiffness: 440,
  mass: 0.82,
};

const CONTENT_TRANSITION = {
  type: 'timing' as const,
  duration: 185,
  easing: Easing.out(Easing.cubic),
};

type LucideTabIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

/** Selected: large inverse icon only. Unselected: muted small icon (+ label rendered by parent). */
function TabBarLucideIcon({
  Icon,
  focused,
}: {
  Icon: LucideTabIcon;
  focused: boolean;
}) {
  return (
    <View style={styles.iconStack} pointerEvents="none">
      <MotiView
        style={styles.iconLayer}
        pointerEvents="none"
        animate={{ opacity: focused ? 1 : 0 }}
        transition={CONTENT_TRANSITION}
      >
        <Icon
          size={TAB_ICON_SELECTED}
          color={colors.textInverse}
          strokeWidth={TAB_STROKE.active}
        />
      </MotiView>
      <MotiView
        style={styles.iconLayer}
        pointerEvents="none"
        animate={{ opacity: focused ? 0 : 1 }}
        transition={CONTENT_TRANSITION}
      >
        <Icon
          size={TAB_ICON_SIZE}
          color={colors.textMuted}
          strokeWidth={TAB_STROKE.idle}
        />
      </MotiView>
    </View>
  );
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function configureTabBarLayoutAnimation() {
  LayoutAnimation.configureNext({
    duration: 320,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}

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
        tabBarIcon?: (p: {
          focused: boolean;
          color: string;
          size: number;
        }) => ReactNode;
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

const TAB_BAR_HEIGHT_FALLBACK = 108;

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedCircleId = useNavigationStore((s) => s.focusedCircleId);
  const setFocusedCircleId = useNavigationStore((s) => s.setFocusedCircleId);
  const tabBarHidden = useNavigationStore((s) => s.tabBarHidden);
  const [tabBarHeight, setTabBarHeight] = useState(0);

  useEffect(() => {
    registerTabNavigator((name) => navigation.navigate(name));
  }, [navigation]);

  const visibleRoutes = state.routes.filter(
    (r) => !(focusedCircleId && r.name === 'circles')
  );

  const focusedRoute = state.routes[state.index];
  const focusedName = focusedRoute?.name;

  const visibleKey = `${focusedCircleId ?? 'none'}|${visibleRoutes.map((r) => r.name).join('|')}`;
  const prevVisibleLen = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (prevVisibleLen.current !== null && prevVisibleLen.current !== visibleRoutes.length) {
      if (!tabBarHidden) {
        configureTabBarLayoutAnimation();
      }
    }
    prevVisibleLen.current = visibleRoutes.length;
  }, [visibleRoutes.length, tabBarHidden]);

  const prevCircle = useRef<string | null | undefined>(undefined);
  useLayoutEffect(() => {
    if (prevCircle.current !== undefined && prevCircle.current !== focusedCircleId) {
      if (!tabBarHidden) {
        configureTabBarLayoutAnimation();
      }
    }
    prevCircle.current = focusedCircleId;
  }, [focusedCircleId, tabBarHidden]);

  useEffect(() => {
    if (focusedCircleId && focusedName === 'circles') {
      navigation.navigate('index');
    }
  }, [focusedCircleId, focusedName, navigation]);

  const [tabLayouts, setTabLayouts] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});
  const [pill, setPill] = useState({ left: 0, top: 0, opacity: 0 });

  useLayoutEffect(() => {
    setTabLayouts({});
    setPill({ left: 0, top: 0, opacity: 0 });
  }, [visibleKey]);

  const focusedKey = focusedRoute?.key;
  useEffect(() => {
    if (!focusedKey) return;
    const L = tabLayouts[focusedKey];
    if (!L || L.width <= 0 || L.height <= 0) return;

    const D = HIGHLIGHT_DIAMETER;
    const cx = L.x + L.width / 2;
    const cy = L.y + L.height / 2;
    setPill({
      left: cx - D / 2,
      top: cy - D / 2,
      opacity: 1,
    });
  }, [focusedKey, tabLayouts]);

  const onTabLayout = (routeKey: string) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setTabLayouts((prev) => ({ ...prev, [routeKey]: { x, y, width, height } }));
  };

  // Only Chat can hide the tab bar. If a different tab is active, always show it —
  // no effects or timing needed, just a synchronous check on the tab navigator state.
  const effectiveHidden = tabBarHidden && focusedName === 'chat';

  // Guard against stale measurements taken while MotiView was collapsed (e.g. after hot
  // reload). The pill alone is ~62px, so any value below that is clearly wrong.
  const MIN_VALID_HEIGHT = 60;
  const openHeight = tabBarHeight > MIN_VALID_HEIGHT ? tabBarHeight : TAB_BAR_HEIGHT_FALLBACK;

  return (
    <MotiView
      style={{ width: '100%', overflow: 'hidden' }}
      animate={{
        height: effectiveHidden ? 0 : openHeight,
        opacity: effectiveHidden ? 0 : 1,
      }}
      transition={{
        type: 'timing',
        duration: TAB_BAR_HIDE_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
      }}
      pointerEvents={effectiveHidden ? 'none' : 'auto'}
    >
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > MIN_VALID_HEIGHT && !effectiveHidden && Math.abs(h - tabBarHeight) > 0.5) {
            setTabBarHeight(h);
          }
        }}
        style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
      <View style={styles.pillOuter}>
        <View style={styles.pillShell}>
          <View style={styles.pillInner} pointerEvents="box-none">
            <View style={styles.tabBarTrack} pointerEvents="box-none">
              <MotiView
                pointerEvents="none"
                style={styles.selectionPillBase}
                from={{
                  left: 0,
                  top: 0,
                  width: HIGHLIGHT_DIAMETER,
                  height: HIGHLIGHT_DIAMETER,
                  opacity: 0,
                }}
                animate={{
                  left: pill.left,
                  top: pill.top,
                  width: HIGHLIGHT_DIAMETER,
                  height: HIGHLIGHT_DIAMETER,
                  opacity: pill.opacity,
                }}
                transition={HIGHLIGHT_SPRING}
              />
              <View style={styles.tabsRow} pointerEvents="box-none">
              {visibleRoutes.map((route) => {
                const { options } = descriptors[route.key];
                const isFocused = focusedName === route.name;
                const label = (options.title ?? route.name).toUpperCase();

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (event.defaultPrevented) return;

                  if (route.name === 'index' && focusedCircleId && isFocused) {
                    configureTabBarLayoutAnimation();
                    setFocusedCircleId(null);
                    return;
                  }

                  if (!isFocused) {
                    navigation.navigate(route.name, route.params);
                  }
                };

                const iconSelected = options.tabBarIcon?.({
                  focused: true,
                  color: colors.textInverse,
                  size: TAB_ICON_SELECTED,
                });
                const iconIdle = options.tabBarIcon?.({
                  focused: false,
                  color: colors.textMuted,
                  size: TAB_ICON_SIZE,
                });

                return (
                  <Pressable
                    key={route.key}
                    style={styles.tab}
                    onLayout={onTabLayout(route.key)}
                    onPress={onPress}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={isFocused ? { selected: true } : {}}
                  >
                    <MotiView
                      style={StyleSheet.absoluteFillObject}
                      animate={{ opacity: isFocused ? 1 : 0 }}
                      transition={CONTENT_TRANSITION}
                      pointerEvents={isFocused ? 'auto' : 'none'}
                    >
                      <View style={styles.tabLayerFill}>
                        {iconSelected}
                      </View>
                    </MotiView>
                    <MotiView
                      style={StyleSheet.absoluteFillObject}
                      animate={{ opacity: isFocused ? 0 : 1 }}
                      transition={CONTENT_TRANSITION}
                      pointerEvents={isFocused ? 'none' : 'auto'}
                    >
                      <View style={styles.tabLayerFill}>
                        <View style={styles.tabIdleColumn}>
                          {iconIdle}
                          <Text style={styles.labelMuted} numberOfLines={1}>
                            {label}
                          </Text>
                        </View>
                      </View>
                    </MotiView>
                  </Pressable>
                );
              })}
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
    </MotiView>
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
          tabBarIcon: ({ focused }) => <TabBarLucideIcon Icon={Sun} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: 'Circles',
          tabBarIcon: ({ focused }) => <TabBarLucideIcon Icon={Circle} focused={focused} />,
          href: circleMode ? null : '/circles',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => <TabBarLucideIcon Icon={MessageCircle} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="concerns"
        options={{
          title: 'Concerns',
          tabBarIcon: ({ focused }) => <TabBarLucideIcon Icon={Flag} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => <TabBarLucideIcon Icon={BringToFront} focused={focused} />,
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
  pillOuter: {
    overflow: 'hidden',
    borderRadius: radius.full,
  },
  pillShell: {
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillInner: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    minHeight: 62,
    position: 'relative',
  },
  /** Shared origin (0,0) for highlight `left/top` and tab `onLayout` x/y — do not position highlight outside this. */
  tabBarTrack: {
    position: 'relative',
    width: '100%',
    height: TAB_ROW_INNER_H,
  },
  selectionPillBase: {
    position: 'absolute',
    backgroundColor: colors.primary,
    borderRadius: 9999,
    zIndex: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    height: TAB_ROW_INNER_H,
    position: 'relative',
    backgroundColor: 'transparent',
    zIndex: 2,
    elevation: 4,
  },
  tabLayerFill: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIdleColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconStack: {
    width: ICON_STACK,
    height: ICON_STACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelMuted: {
    fontSize: 9,
    fontFamily: 'OpenSans_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
