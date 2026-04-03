import { create } from 'zustand';

interface NavigationState {
  /** When set, tab bar switches to circle-focused mode (Chat · Concerns · Tasks). */
  focusedCircleId: string | null;
  setFocusedCircleId: (id: string | null) => void;
  /** Focus this circle, or clear focus if already selected. */
  toggleFocusedCircle: (id: string) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  focusedCircleId: null,
  setFocusedCircleId: (id) => set({ focusedCircleId: id }),
  toggleFocusedCircle: (id) =>
    set({
      focusedCircleId: get().focusedCircleId === id ? null : id,
    }),
}));
