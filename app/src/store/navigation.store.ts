import { create } from 'zustand';

/** Must match `CustomTabBar` Moti hide duration and hub→thread defer in chat. */
export const TAB_BAR_HIDE_ANIMATION_MS = 280;

/**
 * Captured from CustomTabBar's `navigation` prop — the ONLY reliable way to switch
 * bottom tabs programmatically. Calling `navigateToTab('index')` does the same thing
 * as pressing the Today icon in the tab bar.
 */
let _navigateToTab: ((name: string) => void) | null = null;
export function registerTabNavigator(navigate: (name: string) => void) {
  _navigateToTab = navigate;
}
export function navigateToTab(name: string) {
  _navigateToTab?.(name);
}

interface NavigationState {
  /** When set, tab bar switches to circle-focused mode (Chat · Concerns · Tasks). */
  focusedCircleId: string | null;
  setFocusedCircleId: (id: string | null) => void;
  /** Focus this circle, or clear focus if already selected. */
  toggleFocusedCircle: (id: string) => void;
  /** When true, custom tab bar animates off-screen (full-height content). */
  tabBarHidden: boolean;
  setTabBarHidden: (hidden: boolean) => void;
  /** Hub → thread: hide tab bar first; cleared after circle view finishes loading. */
  tabBarHideFromHubTransition: boolean;
  setTabBarHideFromHubTransition: (v: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  focusedCircleId: null,
  tabBarHidden: false,
  tabBarHideFromHubTransition: false,
  setFocusedCircleId: (id) => set({ focusedCircleId: id }),
  toggleFocusedCircle: (id) =>
    set({
      focusedCircleId: get().focusedCircleId === id ? null : id,
    }),
  setTabBarHidden: (hidden) => set({ tabBarHidden: hidden }),
  setTabBarHideFromHubTransition: (v) => set({ tabBarHideFromHubTransition: v }),
}));
