import type {
  BackgroundGradient,
  ChartFillStyle,
  ChartOrientation,
  FieldId,
  ImageOverlay,
  LayerId,
  RouteMapVariant,
  RouteMode,
  StatsLayoutKind,
} from '@/types/preview';
import type * as ImagePicker from 'expo-image-picker';

export const ROUTE_LAYER_WIDTH = 280;
export const ROUTE_LAYER_HEIGHT = 180;
export const ROUTE_DEFAULT_Y_RAISE = 130;
export const IMAGE_OVERLAY_MAX_INITIAL = 180;
export const IMAGE_OVERLAY_MIN_INITIAL = 90;
export const EXPORT_PNG_WIDTH = 1080;
export const PREVIEW_DRAFT_KEY_PREFIX = 'paceframe.preview.draft.';
export const PREVIEW_TEMPLATE_MEDIA_KEY_PREFIX =
  'paceframe.preview.template-media.';
export const SUBJECT_COVERAGE_MIN_PERCENT = 1;
export const SUBJECT_COVERAGE_MAX_PERCENT = 93;
export const SPLIT_BOLD_DEFAULT_TEXT_OPACITY = 0.6;

export const DEFAULT_VISIBLE_FIELDS: Record<FieldId, boolean> = {
  distance: true,
  time: true,
  pace: true,
  elev: true,
  cadence: false,
  calories: false,
  avgHr: false,
};

export const SUNSET_HERO_DEFAULT_VISIBLE_FIELDS: Record<FieldId, boolean> = {
  distance: true,
  time: true,
  pace: true,
  elev: true,
  cadence: false,
  calories: false,
  avgHr: true,
};

export const DEFAULT_HEADER_VISIBLE = {
  title: true,
  date: true,
  location: true,
};

export type HeaderVisible = typeof DEFAULT_HEADER_VISIBLE;

export const DEFAULT_VISIBLE_LAYERS: Partial<Record<LayerId, boolean>> = {
  meta: true,
  stats: true,
  primary: true,
  route: false,
  chartPace: false,
  chartHr: false,
};

export const BACKGROUND_GRADIENT_PRESETS: BackgroundGradient[] = [
  { colors: ['#0F172A', '#1D4ED8', '#38BDF8'], direction: 'vertical' },
  { colors: ['#111827', '#7C3AED', '#F97316'], direction: 'horizontal' },
  { colors: ['#052E16', '#16A34A', '#86EFAC'], direction: 'vertical' },
  { colors: ['#3F1D2E', '#DB2777', '#FBCFE8'], direction: 'horizontal' },
  { colors: ['#1C1917', '#EA580C', '#FACC15'], direction: 'vertical' },
  { colors: ['#0B132B', '#1C2541', '#5BC0BE'], direction: 'horizontal' },
  { colors: ['#1F2937', '#374151', '#9CA3AF'], direction: 'vertical' },
  { colors: ['#164E63', '#0E7490', '#67E8F9'], direction: 'horizontal' },
  { colors: ['#0A0A0A', '#3B0764', '#C4B5FD'], direction: 'vertical' },
  { colors: ['#312E81', '#4F46E5', '#A5B4FC'], direction: 'horizontal' },
];

export type SunsetPrimaryGradient = [string, string, string];

export const DEFAULT_SUNSET_PRIMARY_GRADIENT: SunsetPrimaryGradient = [
  '#FFF4B5',
  '#FFC84A',
  '#FF8A00',
];

export const SUNSET_PRIMARY_GRADIENT_PRESETS: SunsetPrimaryGradient[] = [
  DEFAULT_SUNSET_PRIMARY_GRADIENT,
  ['#FFE8CC', '#FF9F43', '#FF6B00'],
  ['#FDF2F8', '#FB7185', '#E11D48'],
  ['#FEF9C3', '#FACC15', '#EAB308'],
  ['#ECFEFF', '#22D3EE', '#0EA5E9'],
  ['#EEF2FF', '#818CF8', '#4F46E5'],
  ['#F3E8FF', '#C084FC', '#7E22CE'],
  ['#DCFCE7', '#4ADE80', '#16A34A'],
  ['#E0F2FE', '#38BDF8', '#2563EB'],
  ['#E2E8F0', '#94A3B8', '#334155'],
];

export type VisualEffectId =
  | 'none'
  | 'black-and-white'
  | 'bw-soft'
  | 'warm-sunset'
  | 'cool-night'
  | 'background-blur'
  | 'background-radial-blur'
  | 'background-motion-blur';

export type FilterEffectId =
  | 'none'
  | 'black-and-white'
  | 'bw-soft'
  | 'warm-sunset'
  | 'cool-night';

export type BlurEffectId =
  | 'none'
  | 'background-blur'
  | 'background-radial-blur'
  | 'background-motion-blur';

export type VisualFilterStep =
  | { brightness: number }
  | { contrast: number }
  | { grayscale: number }
  | { hueRotate: string }
  | { opacity: number }
  | { saturate: number }
  | { sepia: number };

export type VisualEffectPreset = {
  id: VisualEffectId;
  label: string;
  description: string;
  backgroundBlurRadius?: number;
  backgroundRadialFocus?: boolean;
  backgroundFilter?: VisualFilterStep[];
  subjectFilter?: VisualFilterStep[];
  backgroundOverlayColor: string;
  backgroundOverlayOpacity: number;
  subjectOverlayColor: string;
  subjectOverlayOpacity: number;
};

export const VISUAL_EFFECT_PRESETS: VisualEffectPreset[] = [
  {
    id: 'none',
    label: 'No Filter',
    description: 'Original look',
    backgroundOverlayColor: '#000000',
    backgroundOverlayOpacity: 0,
    subjectOverlayColor: '#000000',
    subjectOverlayOpacity: 0,
  },
  {
    id: 'black-and-white',
    label: 'Black & White',
    description: 'Black and white',
    backgroundOverlayColor: '#000000',
    backgroundOverlayOpacity: 0,
    subjectOverlayColor: '#000000',
    subjectOverlayOpacity: 0,
  },
  {
    id: 'bw-soft',
    label: 'B&W Soft',
    description: 'Soft editorial black and white',
    backgroundOverlayColor: '#F3F3F3',
    backgroundOverlayOpacity: 0.08,
    subjectOverlayColor: '#E9E9E9',
    subjectOverlayOpacity: 0.06,
  },
  {
    id: 'warm-sunset',
    label: 'Warm Sunset',
    description: 'Warm golden tone',
    backgroundOverlayColor: '#FF8A3D',
    backgroundOverlayOpacity: 0.16,
    subjectOverlayColor: '#FFC67D',
    subjectOverlayOpacity: 0.12,
  },
  {
    id: 'cool-night',
    label: 'Cool Night',
    description: 'Cool blue night tone',
    backgroundOverlayColor: '#1F4D8A',
    backgroundOverlayOpacity: 0.16,
    subjectOverlayColor: '#5D9CE8',
    subjectOverlayOpacity: 0.1,
  },
  {
    id: 'background-blur',
    label: 'Background Blur',
    description: 'Blur only on background',
    backgroundBlurRadius: 3,
    backgroundOverlayColor: '#000000',
    backgroundOverlayOpacity: 0.06,
    subjectOverlayColor: '#000000',
    subjectOverlayOpacity: 0,
  },
  {
    id: 'background-radial-blur',
    label: 'Background Radial Blur',
    description: 'Radial blur on background',
    backgroundBlurRadius: 18,
    backgroundRadialFocus: true,
    backgroundOverlayColor: '#111111',
    backgroundOverlayOpacity: 0.14,
    subjectOverlayColor: '#000000',
    subjectOverlayOpacity: 0,
  },
  {
    id: 'background-motion-blur',
    label: 'Background Motion Blur',
    description: 'Directional blur on background',
    backgroundOverlayColor: '#111111',
    backgroundOverlayOpacity: 0.1,
    subjectOverlayColor: '#000000',
    subjectOverlayOpacity: 0,
  },
];

const FILTER_EFFECT_IDS: FilterEffectId[] = [
  'none',
  'black-and-white',
  'bw-soft',
  'warm-sunset',
  'cool-night',
];

const BLUR_EFFECT_IDS: BlurEffectId[] = [
  'none',
  'background-blur',
  'background-radial-blur',
  'background-motion-blur',
];

export function isFilterEffectId(value: string): value is FilterEffectId {
  return FILTER_EFFECT_IDS.includes(value as FilterEffectId);
}

export function isBlurEffectId(value: string): value is BlurEffectId {
  return BLUR_EFFECT_IDS.includes(value as BlurEffectId);
}

export type StyleLayerId =
  | 'meta'
  | 'stats'
  | 'route'
  | 'primary'
  | 'chartPace'
  | 'chartHr';

export type StyleLayerSettings = {
  color: string;
  opacity: number;
};

export type LayerStyleMap = Record<StyleLayerId, StyleLayerSettings>;
export type LayerStyleMapByLayout = Partial<Record<StatsLayoutKind, LayerStyleMap>>;

export type NormalPreviewSnapshot = {
  media: ImagePicker.ImagePickerAsset | null;
  backgroundGradient: BackgroundGradient | null;
  autoSubjectUri: string | null;
  autoSubjectSourceUri: string | null;
  imageOverlays: ImageOverlay[];
  selectedLayoutId: string;
  routeMode: RouteMode;
  routeMapVariant: RouteMapVariant;
  visible: Record<FieldId, boolean>;
  headerVisible: HeaderVisible;
  primaryField: FieldId;
  visibleLayers: Partial<Record<LayerId, boolean>>;
  layerOrder: LayerId[];
  layerTransforms: Partial<
    Record<LayerId, { x: number; y: number; scale: number; rotationDeg: number }>
  >;
  behindSubjectLayers: Partial<Record<LayerId, boolean>>;
  layerStyleMapByLayout: LayerStyleMapByLayout;
  showChartAxes: boolean;
  showChartGrid: boolean;
  paceChartOrientation: ChartOrientation;
  paceChartFill: ChartFillStyle;
  isSquareFormat: boolean;
};

const DEFAULT_LAYER_STYLE_MAP: LayerStyleMap = {
  meta: { color: '#FFFFFF', opacity: 1 },
  stats: { color: '#FFFFFF', opacity: 1 },
  route: { color: '#D4FF54', opacity: 1 },
  primary: { color: '#FFFFFF', opacity: 1 },
  chartPace: { color: '#FFFFFF', opacity: 1 },
  chartHr: { color: '#FFFFFF', opacity: 1 },
};

export function getDefaultLayerStyleMapForLayout(
  layout: StatsLayoutKind,
): LayerStyleMap {
  if (layout !== 'split-bold') {
    return {
      meta: { ...DEFAULT_LAYER_STYLE_MAP.meta },
      stats: { ...DEFAULT_LAYER_STYLE_MAP.stats },
      route: { ...DEFAULT_LAYER_STYLE_MAP.route },
      primary: { ...DEFAULT_LAYER_STYLE_MAP.primary },
      chartPace: { ...DEFAULT_LAYER_STYLE_MAP.chartPace },
      chartHr: { ...DEFAULT_LAYER_STYLE_MAP.chartHr },
    };
  }

  return {
    meta: { ...DEFAULT_LAYER_STYLE_MAP.meta },
    stats: {
      ...DEFAULT_LAYER_STYLE_MAP.stats,
      opacity: SPLIT_BOLD_DEFAULT_TEXT_OPACITY,
    },
    route: { ...DEFAULT_LAYER_STYLE_MAP.route },
    primary: {
      ...DEFAULT_LAYER_STYLE_MAP.primary,
      opacity: SPLIT_BOLD_DEFAULT_TEXT_OPACITY,
    },
    chartPace: { ...DEFAULT_LAYER_STYLE_MAP.chartPace },
    chartHr: { ...DEFAULT_LAYER_STYLE_MAP.chartHr },
  };
}

export function getDefaultVisibleLayersForLayout(
  _layout: StatsLayoutKind,
): Partial<Record<LayerId, boolean>> {
  return { ...DEFAULT_VISIBLE_LAYERS };
}
