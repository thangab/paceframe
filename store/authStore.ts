import { create } from 'zustand';
import {
  AuthConnections,
  AuthProvider,
  AuthTokens,
  PersistedAuthState,
} from '@/types/strava';
import { clearTokens, getAuthState, saveAuthState } from '@/lib/storage';
import { configureRevenueCat } from '@/lib/revenuecat';

function getRevenueCatUserId(state: PersistedAuthState | null) {
  const athleteId =
    state?.connections.strava?.athleteId ??
    (state?.activeProvider ? state.connections[state.activeProvider]?.athleteId : undefined);
  return athleteId ? String(athleteId) : null;
}

function pickFallbackProvider(connections: AuthConnections): AuthProvider | null {
  if (connections.strava) return 'strava';
  if (connections.garmin) return 'garmin';
  if (connections.mock) return 'mock';
  return null;
}

type AuthState = {
  tokens: AuthTokens | null;
  connections: AuthConnections;
  activeProvider: AuthProvider | null;
  isHydrated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  login: (tokens: AuthTokens) => Promise<void>;
  disconnect: (provider: AuthProvider) => Promise<void>;
  setActiveProvider: (provider: AuthProvider | null) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  tokens: null,
  connections: {},
  activeProvider: null,
  isHydrated: false,
  isLoading: false,
  hydrate: async () => {
    set({ isLoading: true });
    const authState = await getAuthState();
    const activeProvider = authState?.activeProvider ?? null;
    const tokens = activeProvider ? authState?.connections[activeProvider] ?? null : null;
    set({
      tokens,
      connections: authState?.connections ?? {},
      activeProvider,
      isHydrated: true,
      isLoading: false,
    });
    await configureRevenueCat(getRevenueCatUserId(authState));
  },
  login: async (tokens) => {
    set({ isLoading: true });
    const currentState = get();
    const connections = {
      ...currentState.connections,
      [tokens.provider]: tokens,
    };
    const nextState: PersistedAuthState = {
      activeProvider: tokens.provider,
      connections,
    };
    set({
      tokens,
      connections,
      activeProvider: tokens.provider,
      isLoading: true,
    });
    await saveAuthState(nextState);
    await configureRevenueCat(getRevenueCatUserId(nextState));
    set({ isLoading: false });
  },
  disconnect: async (provider) => {
    const currentState = get();
    const connections = { ...currentState.connections };
    delete connections[provider];
    const activeProvider =
      currentState.activeProvider === provider
        ? pickFallbackProvider(connections)
        : currentState.activeProvider;
    const tokens = activeProvider ? connections[activeProvider] ?? null : null;
    const persistedState: PersistedAuthState = {
      activeProvider,
      connections,
    };
    set({
      connections,
      activeProvider,
      tokens,
      isLoading: true,
    });
    if (persistedState && Object.keys(persistedState.connections).length > 0) {
      await saveAuthState(persistedState);
      await configureRevenueCat(getRevenueCatUserId(persistedState));
    } else {
      await clearTokens();
      await configureRevenueCat(null);
    }
    set({ isLoading: false });
  },
  setActiveProvider: async (provider) => {
    const currentState = get();
    const activeProvider =
      provider && currentState.connections[provider] ? provider : null;
    const tokens = activeProvider
      ? currentState.connections[activeProvider] ?? null
      : null;
    const persistedState: PersistedAuthState = {
      activeProvider,
      connections: currentState.connections,
    };
    set({
      activeProvider,
      tokens,
      isLoading: true,
    });
    if (persistedState) {
      if (Object.keys(persistedState.connections).length > 0) {
        await saveAuthState(persistedState);
      } else {
        await clearTokens();
      }
      await configureRevenueCat(getRevenueCatUserId(persistedState));
    }
    set({ isLoading: false });
  },
  logout: async () => {
    set({ isLoading: true });
    await clearTokens();
    set({
      tokens: null,
      connections: {},
      activeProvider: null,
      isLoading: false,
    });
    await configureRevenueCat(null);
  },
}));
