import { create } from 'zustand';
import {
  api,
  setTokens,
  clearTokens,
  registerDeviceTokenWithApi,
} from '../lib/api';
import { getOrCreateDeviceId } from '../lib/deviceId';
import { getExpoPushRegistration } from '../lib/pushToken';
import type { User } from '@care/shared/types';
import type { ApiResponse } from '@care/shared/types';

type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};

async function syncPushTokenToApi(): Promise<void> {
  const reg = await getExpoPushRegistration();
  if (!reg) {
    return;
  }
  try {
    await registerDeviceTokenWithApi(reg.token, reg.platform);
  } catch {
    // Push registration is best-effort (permissions, simulator, etc.).
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }) => Promise<void>;
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
      await syncPushTokenToApi();
    } catch {
      set({ user: null, isInitialized: true });
    }
  },

  loginWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await api.post<AuthTokensResponse>('/auth/login', {
        email,
        password,
        deviceId,
      });
      await setTokens(response.accessToken, response.refreshToken);
      set({ user: response.user, isLoading: false });
      await syncPushTokenToApi();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async ({ code, codeVerifier, redirectUri }) => {
    set({ isLoading: true });
    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await api.post<AuthTokensResponse>('/auth/google', {
        code,
        codeVerifier,
        redirectUri,
        deviceId,
      });
      await setTokens(response.accessToken, response.refreshToken);
      set({ user: response.user, isLoading: false });
      await syncPushTokenToApi();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await api.post<AuthTokensResponse>('/auth/register', {
        email,
        password,
        name,
        deviceId,
      });
      await setTokens(response.accessToken, response.refreshToken);
      set({ user: response.user, isLoading: false });
      await syncPushTokenToApi();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const deviceId = await getOrCreateDeviceId();
    try {
      await api.post('/auth/logout', { deviceId });
    } catch {
      // still clear local session
    }
    await clearTokens();
    set({ user: null });
  },
}));
