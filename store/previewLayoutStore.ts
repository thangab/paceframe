import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { PREVIEW_LAYOUTS, sanitizePreviewLayouts } from '@/lib/previewLayouts';
import { supabase } from '@/lib/supabaseClient';
import type { StatsLayout } from '@/types/preview';

type PreviewLayoutState = {
  layouts: StatsLayout[];
  isHydrated: boolean;
  lastFetchedAt: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
};

type RemotePreviewLayoutRow = {
  layout: unknown;
};

const CACHE_KEY = 'paceframe.preview.layouts.v1';

async function readCachedLayouts() {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('layouts' in parsed) ||
    !('fetchedAt' in parsed)
  ) {
    return null;
  }

  const layouts = sanitizePreviewLayouts(parsed.layouts);
  const fetchedAt =
    typeof parsed.fetchedAt === 'string' ? parsed.fetchedAt : null;

  if (!layouts || !fetchedAt) return null;
  return { layouts, fetchedAt };
}

async function fetchRemoteLayouts() {
  const { data, error } = await supabase
    .from('preview_layouts')
    .select('layout')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as RemotePreviewLayoutRow[];
  return sanitizePreviewLayouts(rows.map((row) => row.layout));
}

export const usePreviewLayoutStore = create<PreviewLayoutState>((set) => ({
  layouts: PREVIEW_LAYOUTS,
  isHydrated: false,
  lastFetchedAt: null,
  hydrate: async () => {
    try {
      const cached = await readCachedLayouts();
      if (cached) {
        set({
          layouts: cached.layouts,
          lastFetchedAt: cached.fetchedAt,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ layouts: PREVIEW_LAYOUTS, isHydrated: true });
    }

    try {
      const layouts = await fetchRemoteLayouts();
      if (!layouts) return;

      const fetchedAt = new Date().toISOString();
      set({ layouts, lastFetchedAt: fetchedAt, isHydrated: true });
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ layouts, fetchedAt }),
      );
    } catch {
      // Keep the cached or bundled layouts when Supabase is unavailable.
    }
  },
  refresh: async () => {
    const layouts = await fetchRemoteLayouts();
    if (!layouts) return;

    const fetchedAt = new Date().toISOString();
    set({ layouts, lastFetchedAt: fetchedAt, isHydrated: true });
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ layouts, fetchedAt }),
    );
  },
}));
