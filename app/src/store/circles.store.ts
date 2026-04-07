import { create } from 'zustand';
import { api } from '../lib/api';
import { useNavigationStore } from './navigation.store';
import type { Circle, Task, Concern } from '@care/shared/types';
import type { ApiResponse, PaginatedResponse } from '@care/shared/types';

export type CreateFromTemplateInput = {
  template: 'loved_one' | 'kid' | 'pet';
  name: string;
  heartName: string;
  description?: string;
  color?: string;
};

interface CirclesState {
  circles: Circle[];
  activeCircleId: string | null;
  tasks: Record<string, Task[]>; // keyed by circleId
  concerns: Record<string, Concern[]>; // keyed by circleId
  isLoading: boolean;

  fetchCircles: () => Promise<void>;
  /** Load tasks + concerns for every circle (dashboard cards / Today). */
  refreshAllSummaries: () => Promise<void>;
  fetchTasks: (circleId: string) => Promise<void>;
  fetchConcerns: (circleId: string) => Promise<void>;
  setActiveCircle: (circleId: string) => void;
  createCircle: (body: { name: string; heartName: string; description?: string; color?: string }) => Promise<void>;
  createFromTemplate: (body: CreateFromTemplateInput) => Promise<void>;
  completeTask: (
    taskId: string,
    circleId: string,
    opts?: { date: string; slotIndex?: number; notes?: string }
  ) => Promise<void>;
  resolveConcern: (concernId: string, circleId: string) => Promise<void>;
}

export const useCirclesStore = create<CirclesState>((set, get) => ({
  circles: [],
  activeCircleId: null,
  tasks: {},
  concerns: {},
  isLoading: false,

  fetchCircles: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<ApiResponse<Circle[]>>('/circles');
      const mapped = response.data.map((c) => ({
        ...c,
        color: c.color ?? '#6B8F71',
      }));
      set({ circles: mapped, isLoading: false });

      const focused = useNavigationStore.getState().focusedCircleId;
      if (focused && !mapped.some((c) => c.id === focused)) {
        useNavigationStore.getState().setFocusedCircleId(null);
      }
    } catch {
      set({ isLoading: false });
    }
  },

  refreshAllSummaries: async () => {
    const { circles } = get();
    if (circles.length === 0) return;
    await Promise.all(
      circles.flatMap((c) => [get().fetchTasks(c.id), get().fetchConcerns(c.id)])
    );
  },

  createCircle: async (body) => {
    await api.post<ApiResponse<Circle>>('/circles', body);
    await get().fetchCircles();
    await get().refreshAllSummaries();
  },

  createFromTemplate: async (body) => {
    await api.post('/circles/from-template', body);
    await get().fetchCircles();
    await get().refreshAllSummaries();
  },

  fetchTasks: async (circleId) => {
    const date = new Date().toISOString().slice(0, 10);
    const response = await api.get<PaginatedResponse<Task>>(
      `/circles/${circleId}/tasks?date=${encodeURIComponent(date)}`
    );
    set((state) => ({
      tasks: { ...state.tasks, [circleId]: response.data },
    }));
  },

  fetchConcerns: async (circleId) => {
    const response = await api.get<PaginatedResponse<Concern>>(`/circles/${circleId}/concerns`);
    set((state) => ({
      concerns: { ...state.concerns, [circleId]: response.data },
    }));
  },

  setActiveCircle: (circleId) => set({ activeCircleId: circleId }),

  completeTask: async (taskId, circleId, opts) => {
    const today = new Date().toISOString().slice(0, 10);
    await api.patch(`/tasks/${taskId}/complete`, {
      date: opts?.date ?? today,
      slotIndex: opts?.slotIndex,
      notes: opts?.notes,
    });
    await get().fetchTasks(circleId);
  },

  resolveConcern: async (concernId, circleId) => {
    await api.patch(`/concerns/${concernId}`, {
      resolvedAt: new Date().toISOString(),
    });
    await get().fetchConcerns(circleId);
  },
}));
