import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  PREVIEW_TEMPLATES,
  sanitizePreviewTemplates,
} from '@/lib/previewTemplates';
import { supabase } from '@/lib/supabaseClient';
import type { PreviewTemplateDefinition } from '@/types/preview';

type PreviewTemplateState = {
  templates: PreviewTemplateDefinition[];
  isHydrated: boolean;
  lastFetchedAt: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
};

type RemotePreviewTemplateRow = {
  template: unknown;
};

const CACHE_KEY = 'paceframe.preview.templates.v1';

async function readCachedTemplates() {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('templates' in parsed) ||
    !('fetchedAt' in parsed)
  ) {
    return null;
  }

  const templates = sanitizePreviewTemplates(parsed.templates);
  const fetchedAt =
    typeof parsed.fetchedAt === 'string' ? parsed.fetchedAt : null;

  if (!templates || !fetchedAt) return null;
  return { templates, fetchedAt };
}

function mergeTemplates(
  baseTemplates: PreviewTemplateDefinition[],
  remoteTemplates: PreviewTemplateDefinition[],
) {
  const remoteById = new Map(
    remoteTemplates.map((template) => [template.id, template]),
  );
  const merged = baseTemplates.map(
    (template) => remoteById.get(template.id) ?? template,
  );
  const baseIds = new Set(baseTemplates.map((template) => template.id));
  const newRemoteTemplates = remoteTemplates.filter(
    (template) => !baseIds.has(template.id),
  );

  return [...merged, ...newRemoteTemplates];
}

async function fetchRemoteTemplates() {
  const { data, error } = await supabase
    .from('preview_templates')
    .select('template')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as RemotePreviewTemplateRow[];
  const templates = sanitizePreviewTemplates(rows.map((row) => row.template));
  return templates ? mergeTemplates(PREVIEW_TEMPLATES, templates) : null;
}

export const usePreviewTemplateStore = create<PreviewTemplateState>((set) => ({
  templates: PREVIEW_TEMPLATES,
  isHydrated: false,
  lastFetchedAt: null,
  hydrate: async () => {
    try {
      const cached = await readCachedTemplates();
      if (cached) {
        set({
          templates: cached.templates,
          lastFetchedAt: cached.fetchedAt,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ templates: PREVIEW_TEMPLATES, isHydrated: true });
    }

    try {
      const templates = await fetchRemoteTemplates();
      if (!templates) return;

      const fetchedAt = new Date().toISOString();
      set({ templates, lastFetchedAt: fetchedAt, isHydrated: true });
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ templates, fetchedAt }),
      );
    } catch {
      // Keep the cached or bundled templates when Supabase is unavailable.
    }
  },
  refresh: async () => {
    const templates = await fetchRemoteTemplates();
    if (!templates) return;

    const fetchedAt = new Date().toISOString();
    set({ templates, lastFetchedAt: fetchedAt, isHydrated: true });
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ templates, fetchedAt }),
    );
  },
}));
