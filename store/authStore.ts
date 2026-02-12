import { create } from 'zustand';
import { AuthTokens } from '@/types/strava';
import { clearTokens, getTokens, saveTokens } from '@/lib/storage';
import { configureRevenueCat } from '@/lib/revenuecat';

type AuthState = {
  tokens: AuthTokens | null;
  isHydrated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  login: (tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  tokens: null,
  isHydrated: false,
  isLoading: false,
  hydrate: async () => {
    set({ isLoading: true });
    const tokens = await getTokens();
    set({ tokens, isHydrated: true, isLoading: false });
    await configureRevenueCat(tokens?.athleteId ? String(tokens.athleteId) : null);
  },
  login: async (tokens) => {
    set({ isLoading: true });
    await saveTokens(tokens);
    set({ tokens, isLoading: false });
    await configureRevenueCat(tokens?.athleteId ? String(tokens.athleteId) : null);
  },
  logout: async () => {
    set({ isLoading: true });
    await clearTokens();
    set({ tokens: null, isLoading: false });
    await configureRevenueCat(null);
  },
}));
