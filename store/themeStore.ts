import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type AppThemeMode = 'light' | 'dark';

type ThemeState = {
  mode: AppThemeMode;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: AppThemeMode) => Promise<void>;
};

const THEME_MODE_KEY = 'paceframe.theme.mode';

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  isHydrated: false,
  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(THEME_MODE_KEY);
      if (value === 'light' || value === 'dark') {
        set({ mode: value, isHydrated: true });
        return;
      }
    } catch {
      // Keep default theme on storage errors.
    }
    set({ isHydrated: true });
  },
  setMode: async (mode) => {
    set({ mode });
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch {
      // Non-fatal if persistence fails.
    }
  },
}));
