import { create } from 'zustand';
import { api, setToken, clearToken } from '../lib/api';
import type { User } from '@care/shared/types';
import type { ApiResponse } from '@care/shared/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: string, credential: Record<string, unknown>) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const response = await api.get<ApiResponse<User>>('/auth/me');
      set({ user: response.data, isInitialized: true });
    } catch {
      set({ user: null, isInitialized: true });
    }
  },

  loginWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });
      await setToken(response.token);
      set({ user: response.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithOAuth: async (provider, credential) => {
    set({ isLoading: true });
    try {
      const response = await api.post<{ token: string; user: User }>('/auth/oauth', {
        provider,
        ...credential,
      });
      await setToken(response.token);
      set({ user: response.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const response = await api.post<{ token: string; user: User }>('/auth/register', {
        email,
        password,
        name,
      });
      await setToken(response.token);
      set({ user: response.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await clearToken();
    set({ user: null });
  },
}));
