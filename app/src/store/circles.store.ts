import { create } from 'zustand';
import { api } from '../lib/api';
import type { Circle, Task, Concern } from '@care/shared/types';
import type { ApiResponse, PaginatedResponse } from '@care/shared/types';

interface CirclesState {
  circles: Circle[];
  activeCircleId: string | null;
  tasks: Record<string, Task[]>;      // keyed by circleId
  concerns: Record<string, Concern[]>; // keyed by circleId
  isLoading: boolean;

  // Actions
  fetchCircles: () => Promise<void>;
  fetchTasks: (circleId: string) => Promise<void>;
  fetchConcerns: (circleId: string) => Promise<void>;
  setActiveCircle: (circleId: string) => void;
  completeTask: (taskId: string, circleId: string, notes?: string) => Promise<void>;
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
      set({ circles: response.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTasks: async (circleId) => {
    const response = await api.get<PaginatedResponse<Task>>(`/circles/${circleId}/tasks`);
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

  completeTask: async (taskId, circleId, notes) => {
    await api.patch(`/tasks/${taskId}/complete`, { notes });
    // Optimistically update local state
    set((state) => ({
      tasks: {
        ...state.tasks,
        [circleId]: (state.tasks[circleId] ?? []).map((t) =>
          t.id === taskId
            ? { ...t, status: 'completed', completedAt: new Date().toISOString() }
            : t
        ),
      },
    }));
  },
}));
