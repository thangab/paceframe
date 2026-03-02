import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { DistanceUnit, ElevationUnit } from '@/lib/format';

type PreferencesState = {
  distanceUnit: DistanceUnit;
  elevationUnit: ElevationUnit;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setDistanceUnit: (unit: DistanceUnit) => Promise<void>;
  setElevationUnit: (unit: ElevationUnit) => Promise<void>;
};

const DISTANCE_UNIT_KEY = 'paceframe.preferences.distanceUnit';
const ELEVATION_UNIT_KEY = 'paceframe.preferences.elevationUnit';

export const usePreferencesStore = create<PreferencesState>((set) => ({
  distanceUnit: 'km',
  elevationUnit: 'm',
  isHydrated: false,
  hydrate: async () => {
    try {
      const [distanceUnitValue, elevationUnitValue] = await Promise.all([
        AsyncStorage.getItem(DISTANCE_UNIT_KEY),
        AsyncStorage.getItem(ELEVATION_UNIT_KEY),
      ]);
      set({
        distanceUnit: distanceUnitValue === 'mi' ? 'mi' : 'km',
        elevationUnit: elevationUnitValue === 'ft' ? 'ft' : 'm',
        isHydrated: true,
      });
      return;
    } catch {
      // Keep defaults on storage errors.
    }
    set({ isHydrated: true });
  },
  setDistanceUnit: async (distanceUnit) => {
    set({ distanceUnit });
    try {
      await AsyncStorage.setItem(DISTANCE_UNIT_KEY, distanceUnit);
    } catch {
      // Non-fatal if persistence fails.
    }
  },
  setElevationUnit: async (elevationUnit) => {
    set({ elevationUnit });
    try {
      await AsyncStorage.setItem(ELEVATION_UNIT_KEY, elevationUnit);
    } catch {
      // Non-fatal if persistence fails.
    }
  },
}));
