import type {
  PanelTabItem,
  StyleLayerId,
  VisualEffectPreset,
} from '@/components/preview/panel/types';

const GRID_HUES = [200, 220, 250, 280, 330, 8, 22, 38, 48, 62, 75, 95];
const GRID_TONE_ROWS = [
  { s: 100, v: 26 },
  { s: 98, v: 38 },
  { s: 96, v: 52 },
  { s: 92, v: 64 },
  { s: 90, v: 78 },
  { s: 72, v: 92 },
  { s: 52, v: 90 },
  { s: 36, v: 88 },
  { s: 18, v: 86 },
];

const COLOR_PRESET_BASE = [
  '#FFFFFF',
  '#F8FAFC',
  '#E2E8F0',
  '#94A3B8',
  '#64748B',
  '#334155',
  '#111827',
  '#000000',
  '#FEE2E2',
  '#FCA5A5',
  '#EF4444',
  '#B91C1C',
  '#7F1D1D',
  '#FFEDD5',
  '#FDBA74',
  '#F97316',
  '#C2410C',
  '#9A3412',
  '#FEF3C7',
  '#FCD34D',
  '#EAB308',
  '#CA8A04',
  '#854D0E',
  '#ECFCCB',
  '#86EFAC',
  '#22C55E',
  '#15803D',
  '#14532D',
  '#CCFBF1',
  '#5EEAD4',
  '#14B8A6',
  '#0F766E',
  '#134E4A',
  '#DBEAFE',
  '#93C5FD',
  '#60A5FA',
  '#2563EB',
  '#1E3A8A',
  '#E0E7FF',
  '#A5B4FC',
  '#6366F1',
  '#4F46E5',
  '#312E81',
  '#F3E8FF',
  '#D8B4FE',
  '#A855F7',
  '#7E22CE',
  '#581C87',
  '#FCE7F3',
  '#F9A8D4',
  '#EC4899',
  '#BE185D',
] as const;

const BLUR_EFFECT_IDS = [
  'background-blur',
  'background-radial-blur',
  'background-motion-blur',
] as const;

const NO_BLUR_EFFECT: VisualEffectPreset = {
  id: 'none',
  label: 'No Blur',
  description: 'Disable blur',
  backgroundOverlayColor: '#000000',
  backgroundOverlayOpacity: 0,
  subjectOverlayColor: '#000000',
  subjectOverlayOpacity: 0,
};

const DEFAULT_TABS = [
  { id: 'background', label: 'Background', icon: 'image-area-close' },
  { id: 'content', label: 'Content', icon: 'layers-outline' },
  { id: 'design', label: 'Design', icon: 'palette-outline' },
  {
    id: 'effects',
    label: 'Effects',
    icon: 'image-filter-center-focus',
  },
] as const;

const QUICK_TEMPLATE_TABS = [
  { id: 'background', label: 'Background', icon: 'image-area-close' },
  { id: 'design', label: 'Templates', icon: 'view-grid-outline' },
] as const;

export function buildStyleLayerButtons(params: {
  hasLapPaceLayer: boolean;
  hasHeartRateLayer: boolean;
  supportsPrimaryLayer: boolean;
  showPrimaryLayer: boolean | undefined;
}): { id: StyleLayerId; label: string }[] {
  return [
    { id: 'meta', label: 'Header' },
    { id: 'stats', label: 'Stats' },
    { id: 'route', label: 'Route' },
    ...(params.hasLapPaceLayer
      ? [{ id: 'chartPace' as const, label: 'Pace Chart' }]
      : []),
    ...(params.hasHeartRateLayer
      ? [{ id: 'chartHr' as const, label: 'HR Chart' }]
      : []),
    ...(params.supportsPrimaryLayer && params.showPrimaryLayer
      ? [{ id: 'primary' as const, label: 'Primary' }]
      : []),
  ];
}

export function buildColorPresets(primaryColor: string): string[] {
  return [...COLOR_PRESET_BASE, primaryColor];
}

export function buildColorGrid(
  hsvToHex: (h: number, s: number, v: number) => string,
): string[][] {
  const grayscaleRow = GRID_HUES.map((_, index) => {
    const value = 100 - (index / (GRID_HUES.length - 1)) * 100;
    return hsvToHex(0, 0, value);
  });

  return [
    grayscaleRow,
    ...GRID_TONE_ROWS.map((tone) =>
      GRID_HUES.map((hue) => hsvToHex(hue, tone.s, tone.v)),
    ),
  ];
}

export function splitEffectPresets(visualEffectPresets: VisualEffectPreset[]) {
  const filterEffects = visualEffectPresets.filter(
    (effect) => !BLUR_EFFECT_IDS.includes(effect.id as (typeof BLUR_EFFECT_IDS)[number]),
  );
  const blurEffects = [
    NO_BLUR_EFFECT,
    ...visualEffectPresets.filter((effect) =>
      BLUR_EFFECT_IDS.includes(effect.id as (typeof BLUR_EFFECT_IDS)[number]),
    ),
  ];

  return { filterEffects, blurEffects };
}

export function buildMainTabs(params: {
  quickTemplateMode: boolean;
  effectsEnabled: boolean;
  showBackgroundTab: boolean;
}): PanelTabItem[] {
  const tabsSource = params.quickTemplateMode ? QUICK_TEMPLATE_TABS : DEFAULT_TABS;
  return tabsSource
    .map((tab) =>
      tab.id === 'effects'
        ? { ...tab, disabled: !params.effectsEnabled }
        : tab,
    )
    .map((tab) =>
      !params.showBackgroundTab && tab.id === 'background'
        ? { ...tab, disabled: true }
        : tab,
    ) as PanelTabItem[];
}

export function createThemeModeOptions() {
  return [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ] as const;
}

export function createDistanceUnitOptions() {
  return [
    { id: 'km', label: 'Kilometers' },
    { id: 'mi', label: 'Miles' },
  ] as const;
}

export function createElevationUnitOptions() {
  return [
    { id: 'm', label: 'Meters' },
    { id: 'ft', label: 'Feet' },
  ] as const;
}
