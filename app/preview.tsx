import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import ImageCropPicker from 'react-native-image-crop-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { PrimaryButton } from '@/components/PrimaryButton';
import { type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PreviewEditorCanvas } from '@/components/preview/PreviewEditorCanvas';
import {
  PreviewEditorPanel,
  type PreviewPanelTab,
} from '@/components/preview/PreviewEditorPanel';
import {
  CHECKER_SIZE,
  FONT_PRESETS,
  MAX_VIDEO_DURATION_SECONDS,
  STORY_HEIGHT,
  STORY_WIDTH,
} from '@/lib/previewConfig';
import { PREVIEW_LAYOUTS as LAYOUTS } from '@/lib/previewLayouts';
import {
  DEFAULT_PREVIEW_TEMPLATE_ID,
  getPreviewTemplateById,
  PREVIEW_TEMPLATES,
} from '@/lib/previewTemplates';
import {
  BASE_LAYER_ORDER,
  sanitizePreviewDraft,
  type PreviewDraft,
} from '@/lib/previewDraft';
import { removeBackgroundOnDevice } from '@/lib/backgroundRemoval';
import { composeVideoWithOverlay } from '@/lib/nativeVideoComposer';
import {
  DistanceUnit,
  ElevationUnit,
  formatDistanceMeters,
  formatElevationMeters,
  formatDuration,
  formatPace,
} from '@/lib/format';
import { useActivityStore } from '@/store/activityStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import {
  BackgroundGradient,
  FieldId,
  ImageOverlay,
  LayerId,
  PreviewTemplateRenderableTextElement,
  RouteMapVariant,
  RouteMode,
  StatsLayout,
  StatsLayoutKind,
} from '@/types/preview';

const ROUTE_LAYER_WIDTH = 280;
const ROUTE_LAYER_HEIGHT = 180;
const ROUTE_DEFAULT_Y_RAISE = 130;
const IMAGE_OVERLAY_MAX_INITIAL = 180;
const IMAGE_OVERLAY_MIN_INITIAL = 90;
const EXPORT_PNG_WIDTH = 1080;
const DEFAULT_VISIBLE_FIELDS: Record<FieldId, boolean> = {
  distance: true,
  time: true,
  pace: true,
  elev: true,
  cadence: false,
  calories: false,
  avgHr: false,
};
const SUNSET_HERO_DEFAULT_VISIBLE_FIELDS: Record<FieldId, boolean> = {
  distance: true,
  time: true,
  pace: true,
  elev: true,
  cadence: false,
  calories: false,
  avgHr: true,
};
const DEFAULT_HEADER_VISIBLE = {
  title: true,
  date: true,
  location: true,
};
const DEFAULT_VISIBLE_LAYERS: Partial<Record<LayerId, boolean>> = {
  meta: true,
  stats: true,
  primary: true,
  route: false,
};
const PREVIEW_DRAFT_KEY_PREFIX = 'paceframe.preview.draft.';
const BACKGROUND_GRADIENT_PRESETS: BackgroundGradient[] = [
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
type SunsetPrimaryGradient = [string, string, string];
const DEFAULT_SUNSET_PRIMARY_GRADIENT: SunsetPrimaryGradient = [
  '#FFF4B5',
  '#FFC84A',
  '#FF8A00',
];
const SPLIT_BOLD_DEFAULT_TEXT_OPACITY = 0.6;
const SUNSET_PRIMARY_GRADIENT_PRESETS: SunsetPrimaryGradient[] = [
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
type VisualEffectId =
  | 'none'
  | 'black-and-white'
  | 'bw-soft'
  | 'warm-sunset'
  | 'cool-night'
  | 'background-blur'
  | 'background-radial-blur'
  | 'background-motion-blur';
type FilterEffectId =
  | 'none'
  | 'black-and-white'
  | 'bw-soft'
  | 'warm-sunset'
  | 'cool-night';
type BlurEffectId =
  | 'none'
  | 'background-blur'
  | 'background-radial-blur'
  | 'background-motion-blur';
type VisualFilterStep =
  | { brightness: number }
  | { contrast: number }
  | { grayscale: number }
  | { hueRotate: string }
  | { opacity: number }
  | { saturate: number }
  | { sepia: number };
type VisualEffectPreset = {
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
const VISUAL_EFFECT_PRESETS: VisualEffectPreset[] = [
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

function isFilterEffectId(value: string): value is FilterEffectId {
  return FILTER_EFFECT_IDS.includes(value as FilterEffectId);
}

function isBlurEffectId(value: string): value is BlurEffectId {
  return BLUR_EFFECT_IDS.includes(value as BlurEffectId);
}
type StyleLayerId = 'meta' | 'stats' | 'route' | 'primary';
type StyleLayerSettings = {
  color: string;
  opacity: number;
};
type LayerStyleMap = Record<StyleLayerId, StyleLayerSettings>;
type LayerStyleMapByLayout = Partial<Record<StatsLayoutKind, LayerStyleMap>>;
type NormalPreviewSnapshot = {
  media: ImagePicker.ImagePickerAsset | null;
  backgroundGradient: BackgroundGradient | null;
  autoSubjectUri: string | null;
  imageOverlays: ImageOverlay[];
  selectedLayoutId: string;
  routeMode: RouteMode;
  routeMapVariant: RouteMapVariant;
  visible: Record<FieldId, boolean>;
  headerVisible: typeof DEFAULT_HEADER_VISIBLE;
  primaryField: FieldId;
  visibleLayers: Partial<Record<LayerId, boolean>>;
  layerOrder: LayerId[];
  layerTransforms: Partial<
    Record<
      LayerId,
      { x: number; y: number; scale: number; rotationDeg: number }
    >
  >;
  behindSubjectLayers: Partial<Record<LayerId, boolean>>;
  layerStyleMapByLayout: LayerStyleMapByLayout;
};
const DEFAULT_LAYER_STYLE_MAP: LayerStyleMap = {
  meta: { color: '#FFFFFF', opacity: 1 },
  stats: { color: '#FFFFFF', opacity: 1 },
  route: { color: '#D4FF54', opacity: 1 },
  primary: { color: '#FFFFFF', opacity: 1 },
};

function getDefaultLayerStyleMapForLayout(
  layout: StatsLayoutKind,
): LayerStyleMap {
  if (layout !== 'split-bold') {
    return {
      meta: { ...DEFAULT_LAYER_STYLE_MAP.meta },
      stats: { ...DEFAULT_LAYER_STYLE_MAP.stats },
      route: { ...DEFAULT_LAYER_STYLE_MAP.route },
      primary: { ...DEFAULT_LAYER_STYLE_MAP.primary },
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
  };
}

type ApplyImageBackgroundOptions = {
  silent?: boolean;
  successMessage?: string;
  failurePrefix?: string;
  skipBackgroundRemoval?: boolean;
};

function normalizeLocalUri(path: string) {
  if (
    path.startsWith('https://') ||
    path.startsWith('http://') ||
    path.startsWith('file://') ||
    path.startsWith('content://') ||
    path.startsWith('ph://') ||
    path.startsWith('assets-library://')
  ) {
    return path;
  }
  return `file://${path}`;
}

function resolveTemplateText(
  value: string,
  vars: {
    activityName: string;
    locationText: string;
    dateIso: string;
    dateText: string;
    distanceText: string;
    durationText: string;
    paceText: string;
    elevText: string;
    caloriesText: string;
    avgHeartRateText: string;
  },
  options?: {
    formatDate?: string;
  },
) {
  const resolvedDate =
    options?.formatDate && vars.dateIso
      ? formatDateWithPattern(vars.dateIso, options.formatDate) ?? vars.dateText
      : vars.dateText;
  return value
    .replaceAll('{activityName}', vars.activityName)
    .replaceAll('{location}', vars.locationText)
    .replaceAll('{date}', resolvedDate)
    .replaceAll('{distance}', vars.distanceText)
    .replaceAll('{time}', vars.durationText)
    .replaceAll('{pace}', vars.paceText)
    .replaceAll('{elev}', vars.elevText)
    .replaceAll('{calories}', vars.caloriesText)
    .replaceAll('{avgHr}', vars.avgHeartRateText);
}

function tokenizeTemplateText(
  text: string,
  accentStyle?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: '400' | '500' | '600' | '700' | '800' | '900';
    letterSpacing?: number;
    color?: string;
  },
): { text: string; accent?: boolean }[] {
  const tokenRegex = /\[\[(.*?)\]\]/g;
  const tokens: { text: string; accent?: boolean }[] = [];
  let lastIndex = 0;
  let match = tokenRegex.exec(text);
  while (match) {
    const start = match.index;
    const end = tokenRegex.lastIndex;
    if (start > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, start) });
    }
    tokens.push({ text: match[1], accent: true, ...(accentStyle ?? {}) });
    lastIndex = end;
    match = tokenRegex.exec(text);
  }
  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex) });
  }
  return tokens.length ? tokens : [{ text }];
}

function formatDateWithPattern(isoDate: string, pattern: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  const yearShort = year.slice(-2);

  return pattern
    .replaceAll('dd', day)
    .replaceAll('mm', month)
    .replaceAll('YYYY', year)
    .replaceAll('YY', yearShort);
}

function isAppOwnedCacheFile(uri: string) {
  if (!uri.startsWith('file://')) return false;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return false;
  return uri.startsWith(cacheDir) || uri.includes('/Library/Caches/');
}

function getDefaultVisibleLayersForLayout(
  _layout: StatsLayoutKind,
): Partial<Record<LayerId, boolean>> {
  return { ...DEFAULT_VISIBLE_LAYERS };
}

export default function PreviewScreen() {
  const searchParams = useLocalSearchParams<{
    mode?: string | string[];
    templateId?: string | string[];
  }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const activity = useActivityStore((s) => s.selectedActivity());
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const [busy, setBusy] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCapturingOverlay, setIsCapturingOverlay] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [pngTransparentOnly, setPngTransparentOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [centerGuides, setCenterGuides] = useState({
    showVertical: false,
    showHorizontal: false,
  });
  const [showRotationGuide, setShowRotationGuide] = useState(false);
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [backgroundGradient, setBackgroundGradient] =
    useState<BackgroundGradient | null>(null);
  const [autoSubjectUri, setAutoSubjectUri] = useState<string | null>(null);
  const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([]);
  const modeParam = Array.isArray(searchParams.mode)
    ? searchParams.mode[0]
    : searchParams.mode;
  const templateMode = modeParam === 'templates';
  const selectedTemplateParam = Array.isArray(searchParams.templateId)
    ? searchParams.templateId[0]
    : searchParams.templateId;
  const initialLayoutId = LAYOUTS.some(
    (item) => item.id === selectedTemplateParam,
  )
    ? selectedTemplateParam!
    : LAYOUTS[0].id;
  const [selectedLayoutId, setSelectedLayoutId] = useState(initialLayoutId);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    getPreviewTemplateById(selectedTemplateParam)?.id ??
      DEFAULT_PREVIEW_TEMPLATE_ID,
  );
  const [selectedFontId, setSelectedFontId] = useState(FONT_PRESETS[0].id);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [elevationUnit, setElevationUnit] = useState<ElevationUnit>('m');
  const [routeMode, setRouteMode] = useState<RouteMode>('trace');
  const [routeMapVariant, setRouteMapVariant] =
    useState<RouteMapVariant>('standard');
  const [visible, setVisible] = useState<Record<FieldId, boolean>>(
    DEFAULT_VISIBLE_FIELDS,
  );
  const [primaryField, setPrimaryField] = useState<FieldId>('distance');
  const [headerVisible, setHeaderVisible] = useState(DEFAULT_HEADER_VISIBLE);
  const [layerOrder, setLayerOrder] = useState<LayerId[]>(BASE_LAYER_ORDER);
  const [visibleLayers, setVisibleLayers] = useState<
    Partial<Record<LayerId, boolean>>
  >(DEFAULT_VISIBLE_LAYERS);
  const [behindSubjectLayers, setBehindSubjectLayers] = useState<
    Partial<Record<LayerId, boolean>>
  >({});
  const [layerTransforms, setLayerTransforms] = useState<
    Partial<
      Record<
        LayerId,
        { x: number; y: number; scale: number; rotationDeg: number }
      >
    >
  >({});
  const [selectedLayer, setSelectedLayer] = useState<LayerId | null>(null);
  const [outlinedLayer, setOutlinedLayer] = useState<LayerId | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerId | null>(null);
  const [activePanel, setActivePanel] = useState<PreviewPanelTab>('background');
  const [panelOpen, setPanelOpen] = useState(false);
  const [helpPopoverOpen, setHelpPopoverOpen] = useState(false);
  const [isSquareFormat, setIsSquareFormat] = useState(false);
  const [resolvedLocationText, setResolvedLocationText] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [isHydratingDraft, setIsHydratingDraft] = useState(false);
  const [appCacheUsageLabel, setAppCacheUsageLabel] = useState('Cache: --');
  const [layerStyleMapByLayout, setLayerStyleMapByLayout] =
    useState<LayerStyleMapByLayout>({});
  const [sunsetPrimaryGradient, setSunsetPrimaryGradient] =
    useState<SunsetPrimaryGradient>(DEFAULT_SUNSET_PRIMARY_GRADIENT);
  const [selectedFilterEffectId, setSelectedFilterEffectId] =
    useState<FilterEffectId>('none');
  const [selectedBlurEffectId, setSelectedBlurEffectId] =
    useState<BlurEffectId>('none');

  useEffect(() => {
    if (!templateMode) return;
    setPanelOpen(false);
    setActivePanel('background');
  }, [templateMode]);

  useEffect(() => {
    if (!selectedTemplateParam) return;
    if (templateMode) {
      const nextTemplate = getPreviewTemplateById(selectedTemplateParam);
      if (!nextTemplate) return;
      if (nextTemplate.premium && !isPremium) {
        router.push('/paywall');
        return;
      }
      setSelectedTemplateId(nextTemplate.id);
      return;
    }
    if (!LAYOUTS.some((item) => item.id === selectedTemplateParam)) return;
    setSelectedLayoutId(selectedTemplateParam);
  }, [isPremium, selectedTemplateParam, templateMode]);

  const exportRef = useRef<View>(null);
  const managedTempUrisRef = useRef<Set<string>>(new Set());
  const templatePresetAppliedRef = useRef<string | null>(null);
  const normalSnapshotRef = useRef<NormalPreviewSnapshot | null>(null);
  const autoExtractAttemptRef = useRef<string | null>(null);

  const selectedTemplateDefinition = useMemo(
    () =>
      getPreviewTemplateById(selectedTemplateId) ??
      PREVIEW_TEMPLATES[0] ??
      null,
    [selectedTemplateId],
  );
  const activeLayoutId =
    templateMode && selectedTemplateDefinition ? 'hero' : selectedLayoutId;
  const templateDisablesVideoBackground = Boolean(
    templateMode && selectedTemplateDefinition?.disableVideoBackground,
  );
  const template = useMemo(
    () => LAYOUTS.find((item) => item.id === activeLayoutId) ?? LAYOUTS[0],
    [activeLayoutId],
  );
  const layerStyleMap = useMemo(
    () =>
      layerStyleMapByLayout[template.layout] ??
      getDefaultLayerStyleMapForLayout(template.layout),
    [layerStyleMapByLayout, template.layout],
  );
  const hasFilterableBackground = Boolean(
    media?.uri && (media.type === 'image' || media.type === 'video'),
  );
  const hasSubjectFree = Boolean(autoSubjectUri);
  const activeFilterEffectId: FilterEffectId = templateMode
    ? selectedTemplateDefinition?.defaultFilterEffectId &&
      isFilterEffectId(selectedTemplateDefinition.defaultFilterEffectId)
      ? selectedTemplateDefinition.defaultFilterEffectId
      : 'none'
    : selectedFilterEffectId;
  const activeBlurEffectId: BlurEffectId = templateMode
    ? selectedTemplateDefinition?.defaultBlurEffectId &&
      isBlurEffectId(selectedTemplateDefinition.defaultBlurEffectId)
      ? selectedTemplateDefinition.defaultBlurEffectId
      : 'none'
    : selectedBlurEffectId;
  const selectedFilterEffect = useMemo(
    () =>
      VISUAL_EFFECT_PRESETS.find((item) => item.id === activeFilterEffectId) ??
      VISUAL_EFFECT_PRESETS[0],
    [activeFilterEffectId],
  );
  const selectedBlurEffect = useMemo(
    () =>
      VISUAL_EFFECT_PRESETS.find((item) => item.id === activeBlurEffectId) ??
      VISUAL_EFFECT_PRESETS[0],
    [activeBlurEffectId],
  );
  const supportsPrimaryLayer = useMemo(
    () =>
      template.layout === 'sunset-hero' ||
      template.layout === 'morning-glass' ||
      template.layout === 'split-bold',
    [template.layout],
  );
  const fontPreset = useMemo(
    () =>
      FONT_PRESETS.find((item) => item.id === selectedFontId) ??
      FONT_PRESETS[0],
    [selectedFontId],
  );
  const distanceText = formatDistanceMeters(
    activity?.distance ?? 0,
    distanceUnit,
  );
  const durationText = formatDuration(activity?.moving_time ?? 0);
  const paceText = formatPace(
    activity?.distance ?? 0,
    activity?.moving_time ?? 0,
    distanceUnit,
  );
  const elevText = formatElevationMeters(
    activity?.total_elevation_gain ?? 0,
    elevationUnit,
  );
  const cadenceText = formatCadence(activity);
  const hasCadence = Boolean(
    activity?.average_cadence && activity.average_cadence > 0,
  );
  const hasCalories = Boolean(
    (activity?.calories && activity.calories > 0) ||
    (activity?.kilojoules && activity.kilojoules > 0),
  );
  const caloriesText = `${Math.max(
    0,
    Math.round(activity?.calories ?? activity?.kilojoules ?? 0),
  )}`;
  const avgHeartRateText =
    activity?.average_heartrate && activity.average_heartrate > 0
      ? `${Math.round(activity.average_heartrate)} bpm`
      : '-- bpm';
  const hasAvgHeartRate = Boolean(
    activity?.average_heartrate && activity.average_heartrate > 0,
  );
  const statsFieldAvailability = useMemo<Record<FieldId, boolean>>(
    () => ({
      distance: true,
      time: true,
      pace: true,
      elev: true,
      cadence: hasCadence,
      calories: hasCalories,
      avgHr: hasAvgHeartRate,
    }),
    [hasAvgHeartRate, hasCadence, hasCalories],
  );
  const dateText = activity ? formatPreviewDate(activity.start_date) : '';
  const activityPhotoUri = activity?.photoUrl
    ? normalizeLocalUri(activity.photoUrl)
    : null;
  const locationText = useMemo(() => {
    const city = activity?.location_city?.trim();
    if (city) return city;
    return resolvedLocationText;
  }, [activity, resolvedLocationText]);
  const templateFixedTextElements = useMemo<
    PreviewTemplateRenderableTextElement[]
  >(() => {
    if (!templateMode || !selectedTemplateDefinition) return [];
    const templateDataAvailability: Record<FieldId, boolean> = {
      distance: (activity?.distance ?? 0) > 0,
      time: (activity?.moving_time ?? 0) > 0,
      pace: (activity?.distance ?? 0) > 0 && (activity?.moving_time ?? 0) > 0,
      elev:
        typeof activity?.total_elevation_gain === 'number' &&
        !Number.isNaN(activity.total_elevation_gain),
      cadence: hasCadence,
      calories: hasCalories,
      avgHr: hasAvgHeartRate,
    };
    const vars = {
      activityName: activity?.name?.trim() ?? '',
      locationText,
      dateIso: activity?.start_date ?? '',
      dateText,
      distanceText,
      durationText,
      paceText,
      elevText,
      caloriesText,
      avgHeartRateText,
    };
    return (selectedTemplateDefinition.fixedTextElements ?? [])
      .filter((item) =>
        (item.requiredDataFields ?? []).every(
          (fieldId) => templateDataAvailability[fieldId],
        ),
      )
      .map((item) => {
        const resolvedText = resolveTemplateText(item.text, vars, {
          formatDate: item.formatDate,
        });
        const displayText = item.uppercase
          ? resolvedText.toUpperCase()
          : resolvedText;
        return {
          ...item,
          tokens: tokenizeTemplateText(displayText, {
            fontFamily: item.accentFontFamily,
            fontSize: item.accentFontSize,
            fontWeight: item.accentFontWeight,
            letterSpacing: item.accentLetterSpacing,
            color: item.accentColor,
          }),
        };
      });
  }, [
    activity?.distance,
    activity?.moving_time,
    activity?.start_date,
    activity?.total_elevation_gain,
    activity?.name,
    avgHeartRateText,
    caloriesText,
    dateText,
    distanceText,
    durationText,
    elevText,
    locationText,
    paceText,
    selectedTemplateDefinition,
    templateMode,
    hasCadence,
    hasCalories,
    hasAvgHeartRate,
  ]);
  const templateHiddenVisibleConfig: Record<FieldId, boolean> = {
    distance: false,
    time: false,
    pace: false,
    elev: false,
    cadence: false,
    calories: false,
    avgHr: false,
  };
  const templateHiddenHeaderConfig = {
    title: false,
    date: false,
    location: false,
  };
  const templateImageOverlays = useMemo<ImageOverlay[]>(() => {
    if (!templateMode || !selectedTemplateDefinition) return [];
    const mapped = (selectedTemplateDefinition.fixedImageElements ?? []).map(
      (item): ImageOverlay | null => {
        const hasLocalAsset = typeof item.asset === 'number';
        const resolvedUri =
          item.uri === '@activityPhoto'
            ? (activityPhotoUri ?? '')
            : (item.uri ?? '');
        if (!hasLocalAsset && !resolvedUri) return null;
        return {
          id: `template-${item.id}`,
          uri: resolvedUri,
          ...(hasLocalAsset ? { asset: item.asset } : {}),
          name: item.name,
          opacity: item.opacity ?? 1,
          rotationDeg: item.rotationDeg ?? 0,
          width: item.width,
          height: item.height,
        };
      },
    );
    return mapped.filter((item): item is ImageOverlay => item !== null);
  }, [activityPhotoUri, selectedTemplateDefinition, templateMode]);
  const templateImageLayerIds = useMemo<LayerId[]>(
    () => templateImageOverlays.map((item) => `image:${item.id}` as LayerId),
    [templateImageOverlays],
  );
  const templateBackgroundMediaFrame = useMemo(() => {
    if (!templateMode || !selectedTemplateDefinition?.backgroundMediaFrame) {
      return null;
    }
    return selectedTemplateDefinition.backgroundMediaFrame;
  }, [selectedTemplateDefinition, templateMode]);
  const templateBehindSubjectLayers = useMemo<
    Partial<Record<LayerId, boolean>>
  >(() => {
    if (!templateMode || !selectedTemplateDefinition) return {};
    return (selectedTemplateDefinition.fixedImageElements ?? []).reduce(
      (acc, item) => {
        if (!item.isBehind) return acc;
        const resolvedUri =
          item.uri === '@activityPhoto'
            ? (activityPhotoUri ?? '')
            : (item.uri ?? '');
        const hasLocalAsset = typeof item.asset === 'number';
        if (!hasLocalAsset && !resolvedUri) return acc;
        const layerId: LayerId = `image:template-${item.id}`;
        return { ...acc, [layerId]: true };
      },
      {} as Partial<Record<LayerId, boolean>>,
    );
  }, [activityPhotoUri, selectedTemplateDefinition, templateMode]);
  const templateLayerTransforms = useMemo<
    Partial<
      Record<
        LayerId,
        { x: number; y: number; scale: number; rotationDeg: number }
      >
    >
  >(() => {
    if (!templateMode || !selectedTemplateDefinition) return {};
    const mapped = (selectedTemplateDefinition.fixedImageElements ?? [])
      .map((item) => {
        const hasLocalAsset = typeof item.asset === 'number';
        const resolvedUri =
          item.uri === '@activityPhoto'
            ? (activityPhotoUri ?? '')
            : (item.uri ?? '');
        if (!hasLocalAsset && !resolvedUri) return null;
        return {
          id: `image:template-${item.id}` as LayerId,
          x: item.x,
          y: item.y,
          rotationDeg: item.rotationDeg ?? 0,
        };
      })
      .filter(
        (
          item,
        ): item is { id: LayerId; x: number; y: number; rotationDeg: number } =>
          Boolean(item),
      );
    const imageLayerTransforms = mapped.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: {
          x: item.x,
          y: item.y,
          scale: 1,
          rotationDeg: item.rotationDeg,
        },
      }),
      {} as Partial<
        Record<
          LayerId,
          { x: number; y: number; scale: number; rotationDeg: number }
        >
      >,
    );
    if (!selectedTemplateDefinition.routeTransform) {
      return imageLayerTransforms;
    }
    return {
      ...imageLayerTransforms,
      route: {
        x: selectedTemplateDefinition.routeTransform.x,
        y: selectedTemplateDefinition.routeTransform.y,
        scale: selectedTemplateDefinition.routeTransform.scale ?? 1,
        rotationDeg: selectedTemplateDefinition.routeTransform.rotationDeg ?? 0,
      },
    };
  }, [selectedTemplateDefinition, templateMode, activityPhotoUri]);
  const templateVisibleLayers = useMemo<
    Partial<Record<LayerId, boolean>>
  >(() => {
    if (!templateMode || !selectedTemplateDefinition) {
      return DEFAULT_VISIBLE_LAYERS;
    }
    return {
      meta: false,
      stats: false,
      primary: false,
      route: selectedTemplateDefinition.showRoute ?? false,
      ...Object.fromEntries(templateImageLayerIds.map((id) => [id, true])),
    };
  }, [selectedTemplateDefinition, templateImageLayerIds, templateMode]);
  const templateLayerStyleMap = useMemo(() => {
    const base = getDefaultLayerStyleMapForLayout(template.layout);
    if (!templateMode || !selectedTemplateDefinition) return base;
    return {
      ...base,
      ...(selectedTemplateDefinition.layerStyleOverrides ?? {}),
    };
  }, [selectedTemplateDefinition, template.layout, templateMode]);
  const activeVisible = templateMode ? templateHiddenVisibleConfig : visible;
  const activeHeaderVisible = templateMode
    ? templateHiddenHeaderConfig
    : headerVisible;
  const activePrimaryField = templateMode ? 'distance' : primaryField;
  const activeImageOverlays = templateMode
    ? templateImageOverlays
    : imageOverlays;
  const activeVisibleLayers = templateMode
    ? templateVisibleLayers
    : visibleLayers;
  const activeLayerTransforms = templateMode
    ? templateLayerTransforms
    : layerTransforms;
  const activeLayerOrder = useMemo(
    () =>
      templateMode
        ? [...BASE_LAYER_ORDER, ...templateImageLayerIds]
        : layerOrder,
    [layerOrder, templateImageLayerIds, templateMode],
  );
  const activeBehindSubjectLayers = useMemo<Partial<Record<LayerId, boolean>>>(
    () => (templateMode ? templateBehindSubjectLayers : behindSubjectLayers),
    [behindSubjectLayers, templateBehindSubjectLayers, templateMode],
  );
  const activeLayerStyleMap = templateMode
    ? templateLayerStyleMap
    : layerStyleMap;
  const activityPolyline = useMemo(() => {
    const raw = activity?.map?.summary_polyline;
    if (typeof raw !== 'string') return null;
    const normalized = raw.trim();
    if (!normalized) return null;
    if (normalized.toLowerCase() === 'null') return null;
    if (normalized.toLowerCase() === 'undefined') return null;
    return normalized;
  }, [activity?.map?.summary_polyline]);
  const hasRouteLayer = Boolean(activityPolyline);
  const activeRouteMode: RouteMode = templateMode
    ? selectedTemplateDefinition?.showRoute && hasRouteLayer
      ? 'trace'
      : 'off'
    : routeMode;
  const activeRouteMapVariant: RouteMapVariant = templateMode
    ? 'standard'
    : routeMapVariant;
  const supportsFullStatsPreview = useMemo(() => {
    const t = (activity?.type || '').toLowerCase();
    return (
      t === 'run' ||
      t === 'ride' ||
      t === 'walk' ||
      t === 'hike' ||
      t === 'swim'
    );
  }, [activity?.type]);
  const templateMetricLimit = useMemo(
    () => getLayoutMetricLimit(template),
    [template],
  );
  const maxSelectableMetrics = Math.max(1, templateMetricLimit);
  const effectiveVisible = useMemo<Record<FieldId, boolean>>(() => {
    if (!supportsFullStatsPreview) {
      return {
        distance: false,
        time: true,
        pace: false,
        elev: false,
        cadence: false,
        calories: false,
        avgHr: false,
      };
    }

    const orderedFields: FieldId[] = [
      'distance',
      'time',
      'pace',
      'elev',
      'cadence',
      'calories',
      'avgHr',
    ];
    const picked = orderedFields.filter(
      (field) => Boolean(activeVisible[field]) && statsFieldAvailability[field],
    );
    const allowed = new Set(picked.slice(0, maxSelectableMetrics));

    return {
      distance: allowed.has('distance'),
      time: allowed.has('time'),
      pace: allowed.has('pace'),
      elev: allowed.has('elev'),
      cadence: allowed.has('cadence'),
      calories: allowed.has('calories'),
      avgHr: allowed.has('avgHr'),
    };
  }, [
    maxSelectableMetrics,
    statsFieldAvailability,
    supportsFullStatsPreview,
    activeVisible,
  ]);
  const metricTextByField = useMemo<Record<FieldId, string>>(
    () => ({
      distance: distanceText,
      time: durationText,
      pace: paceText,
      elev: elevText,
      cadence: cadenceText,
      calories: caloriesText,
      avgHr: avgHeartRateText,
    }),
    [
      avgHeartRateText,
      cadenceText,
      caloriesText,
      distanceText,
      durationText,
      elevText,
      paceText,
    ],
  );
  const primaryFieldEffective = useMemo<FieldId>(() => {
    if (!supportsPrimaryLayer) return 'distance';
    if (
      effectiveVisible[activePrimaryField] &&
      statsFieldAvailability[activePrimaryField]
    ) {
      return activePrimaryField;
    }
    const fallback = (
      [
        'distance',
        'time',
        'pace',
        'elev',
        'cadence',
        'calories',
        'avgHr',
      ] as FieldId[]
    ).find((field) => effectiveVisible[field] && statsFieldAvailability[field]);
    return fallback ?? 'distance';
  }, [
    effectiveVisible,
    activePrimaryField,
    statsFieldAvailability,
    supportsPrimaryLayer,
  ]);
  const statsVisibleForLayer = useMemo<Record<FieldId, boolean>>(
    () =>
      supportsPrimaryLayer
        ? { ...effectiveVisible, [primaryFieldEffective]: false }
        : effectiveVisible,
    [effectiveVisible, primaryFieldEffective, supportsPrimaryLayer],
  );
  const selectedVisibleMetrics = useMemo(
    () =>
      (effectiveVisible.distance ? 1 : 0) +
      (effectiveVisible.time ? 1 : 0) +
      (effectiveVisible.pace ? 1 : 0) +
      (effectiveVisible.elev ? 1 : 0) +
      (effectiveVisible.cadence ? 1 : 0) +
      (effectiveVisible.calories ? 1 : 0) +
      (effectiveVisible.avgHr ? 1 : 0),
    [effectiveVisible],
  );
  const visibleStatsCount = useMemo(
    () =>
      (statsVisibleForLayer.distance ? 1 : 0) +
      (statsVisibleForLayer.time ? 1 : 0) +
      (statsVisibleForLayer.pace ? 1 : 0) +
      (statsVisibleForLayer.elev ? 1 : 0) +
      (statsVisibleForLayer.cadence ? 1 : 0) +
      (statsVisibleForLayer.calories ? 1 : 0) +
      (statsVisibleForLayer.avgHr ? 1 : 0),
    [statsVisibleForLayer],
  );
  const dynamicStatsWidth = useMemo(
    () => getDynamicStatsWidth(template, visibleStatsCount),
    [template, visibleStatsCount],
  );
  const layerZ = useMemo(() => {
    return activeLayerOrder.reduce(
      (acc, id, index) => ({ ...acc, [id]: index + 1 }),
      {} as Partial<Record<LayerId, number>>,
    );
  }, [activeLayerOrder]);
  const baseLayerZ = (id: LayerId) =>
    activeBehindSubjectLayers[id] ? 2 : (layerZ[id] ?? 1) * 10 + 10;
  const layerEntries = useMemo(() => {
    const labelMap = new Map<LayerId, string>([
      ['meta', 'Header'],
      ['stats', 'Stats'],
      ['primary', 'Primary'],
      ['route', 'Route'],
    ]);
    activeImageOverlays.forEach((item) => {
      labelMap.set(`image:${item.id}`, item.name);
    });
    return activeLayerOrder
      .slice()
      .reverse()
      .filter((id) => (hasRouteLayer ? true : id !== 'route'))
      .filter((id) => (supportsPrimaryLayer ? true : id !== 'primary'))
      .map((id) => ({
        id,
        label: labelMap.get(id) ?? id,
        isBehind: Boolean(activeBehindSubjectLayers[id]),
      }));
  }, [
    activeBehindSubjectLayers,
    activeImageOverlays,
    activeLayerOrder,
    hasRouteLayer,
    supportsPrimaryLayer,
  ]);
  const canvasDisplaySize = useMemo(() => {
    // Keep exact target ratio while fitting visible space above the bottom overlay.
    const targetHeight = isSquareFormat ? STORY_WIDTH : STORY_HEIGHT;
    const ratio = STORY_WIDTH / targetHeight;
    const canvasShrinkFactor = 0.94;
    const reservedBottom = 120;
    const maxWidth = Math.max(220, screenWidth);
    const maxHeight = Math.max(220, screenHeight - reservedBottom);

    let width = maxWidth;
    let height = width / ratio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    return {
      width: Math.round(width * canvasShrinkFactor),
      height: Math.round(height * canvasShrinkFactor),
    };
  }, [isSquareFormat, screenHeight, screenWidth]);
  const canvasDisplayWidth = canvasDisplaySize.width;
  const canvasDisplayHeight = canvasDisplaySize.height;
  const canvasScaleX = useMemo(
    () => canvasDisplayWidth / STORY_WIDTH,
    [canvasDisplayWidth],
  );
  const canvasScaleY = useMemo(
    () => canvasDisplayHeight / STORY_HEIGHT,
    [canvasDisplayHeight],
  );
  const exportHeight = isSquareFormat ? EXPORT_PNG_WIDTH : 1920;
  const dynamicStatsWidthDisplay = useMemo(
    () => Math.round(dynamicStatsWidth * canvasScaleX),
    [canvasScaleX, dynamicStatsWidth],
  );
  const centeredStatsXDisplay = useMemo(
    () => Math.round((canvasDisplayWidth - dynamicStatsWidthDisplay) / 2),
    [canvasDisplayWidth, dynamicStatsWidthDisplay],
  );
  const routeLayerWidthDisplay = useMemo(
    () => Math.round(ROUTE_LAYER_WIDTH * canvasScaleX),
    [canvasScaleX],
  );
  const routeLayerHeightDisplay = useMemo(
    () => Math.round(ROUTE_LAYER_HEIGHT * canvasScaleY),
    [canvasScaleY],
  );
  const routeInitialXDisplay = useMemo(
    () => Math.round((canvasDisplayWidth - routeLayerWidthDisplay) / 2),
    [canvasDisplayWidth, routeLayerWidthDisplay],
  );
  const routeInitialYDisplay = useMemo(
    () =>
      Math.max(
        0,
        Math.round(
          (canvasDisplayHeight - routeLayerHeightDisplay) / 2 -
            ROUTE_DEFAULT_Y_RAISE * canvasScaleY,
        ),
      ),
    [canvasDisplayHeight, canvasScaleY, routeLayerHeightDisplay],
  );
  const checkerTiles = useMemo(() => {
    const cols = Math.ceil(canvasDisplayWidth / CHECKER_SIZE);
    const rows = Math.ceil(canvasDisplayHeight / CHECKER_SIZE);
    const tiles: { key: string; left: number; top: number; dark: boolean }[] =
      [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        tiles.push({
          key: `${row}-${col}`,
          left: col * CHECKER_SIZE,
          top: row * CHECKER_SIZE,
          dark: (row + col) % 2 === 0,
        });
      }
    }
    return tiles;
  }, [canvasDisplayHeight, canvasDisplayWidth]);

  function getDefaultVisibleFieldsForLayout(layout: StatsLayoutKind) {
    if (layout === 'sunset-hero') {
      return SUNSET_HERO_DEFAULT_VISIBLE_FIELDS;
    }

    if (layout === 'morning-glass') {
      const orderedFields: FieldId[] = [
        'distance',
        'time',
        'pace',
        'elev',
        'avgHr',
        'calories',
        'cadence',
      ];
      const availableFields = orderedFields.filter(
        (field) => statsFieldAvailability[field],
      );
      const targetCount = availableFields.length >= 6 ? 6 : 4;
      const selectedFields = new Set(availableFields.slice(0, targetCount));
      return {
        distance: selectedFields.has('distance'),
        time: selectedFields.has('time'),
        pace: selectedFields.has('pace'),
        elev: selectedFields.has('elev'),
        cadence: selectedFields.has('cadence'),
        calories: selectedFields.has('calories'),
        avgHr: selectedFields.has('avgHr'),
      };
    }

    return DEFAULT_VISIBLE_FIELDS;
  }

  const activityDraftKey = useMemo(
    () =>
      activity ? `${PREVIEW_DRAFT_KEY_PREFIX}${String(activity.id)}` : null,
    [activity],
  );

  function resetDraftStateToDefaults(options?: { keepLayoutId?: string }) {
    const templateIdToKeep = options?.keepLayoutId;
    const hasLayoutToKeep = Boolean(
      templateIdToKeep && LAYOUTS.some((item) => item.id === templateIdToKeep),
    );
    const nextLayoutId = hasLayoutToKeep
      ? (templateIdToKeep as string)
      : LAYOUTS[0].id;
    const nextLayoutLayout =
      LAYOUTS.find((item) => item.id === nextLayoutId)?.layout ??
      LAYOUTS[0].layout;
    setMedia(null);
    setBackgroundGradient(null);
    setAutoSubjectUri(null);
    setImageOverlays([]);
    setSelectedLayoutId(nextLayoutId);
    setSelectedFontId(FONT_PRESETS[0].id);
    setDistanceUnit('km');
    setElevationUnit('m');
    setRouteMode('trace');
    setRouteMapVariant('standard');
    setPrimaryField('distance');
    setVisible(getDefaultVisibleFieldsForLayout(nextLayoutLayout));
    setHeaderVisible(DEFAULT_HEADER_VISIBLE);
    setLayerOrder(BASE_LAYER_ORDER);
    setVisibleLayers(getDefaultVisibleLayersForLayout(nextLayoutLayout));
    setBehindSubjectLayers({});
    setLayerTransforms({});
    setIsSquareFormat(false);
    setLayerStyleMapByLayout({
      [nextLayoutLayout]: getDefaultLayerStyleMapForLayout(nextLayoutLayout),
    });
    setSunsetPrimaryGradient(DEFAULT_SUNSET_PRIMARY_GRADIENT);
    setSelectedFilterEffectId('none');
    setSelectedBlurEffectId('none');
    setSelectedLayer(null);
    setOutlinedLayer(null);
    setActiveLayer(null);
  }

  function applyDraft(draft: PreviewDraft) {
    const selectedLayoutLayout =
      LAYOUTS.find((item) => item.id === (draft.selectedLayoutId ?? ''))
        ?.layout ?? LAYOUTS[0].layout;
    setMedia(draft.media ?? null);
    setBackgroundGradient(draft.backgroundGradient ?? null);
    setAutoSubjectUri(draft.autoSubjectUri ?? null);
    setImageOverlays(draft.imageOverlays ?? []);
    setSelectedLayoutId(draft.selectedLayoutId ?? LAYOUTS[0].id);
    setSelectedFontId(draft.selectedFontId ?? FONT_PRESETS[0].id);
    setDistanceUnit(draft.distanceUnit ?? 'km');
    setElevationUnit(draft.elevationUnit ?? 'm');
    setRouteMode(draft.routeMode ?? 'trace');
    setRouteMapVariant(draft.routeMapVariant ?? 'standard');
    setPrimaryField(draft.primaryField ?? 'distance');
    setVisible(draft.visible ?? DEFAULT_VISIBLE_FIELDS);
    setHeaderVisible(draft.headerVisible ?? DEFAULT_HEADER_VISIBLE);
    setLayerOrder(
      draft.layerOrder?.length ? draft.layerOrder : BASE_LAYER_ORDER,
    );
    setVisibleLayers({
      ...getDefaultVisibleLayersForLayout(selectedLayoutLayout),
      ...(draft.visibleLayers ?? {}),
    });
    setBehindSubjectLayers(draft.behindSubjectLayers ?? {});
    setLayerTransforms(draft.layerTransforms ?? {});
    setIsSquareFormat(Boolean(draft.isSquareFormat));
    if (draft.layerStyleMapByLayout) {
      setLayerStyleMapByLayout(draft.layerStyleMapByLayout);
    } else if (draft.layerStyleMap) {
      setLayerStyleMapByLayout({
        [selectedLayoutLayout]: {
          ...getDefaultLayerStyleMapForLayout(selectedLayoutLayout),
          ...draft.layerStyleMap,
        },
      });
    } else {
      setLayerStyleMapByLayout({
        [selectedLayoutLayout]:
          getDefaultLayerStyleMapForLayout(selectedLayoutLayout),
      });
    }
    setSunsetPrimaryGradient(
      draft.sunsetPrimaryGradient ?? DEFAULT_SUNSET_PRIMARY_GRADIENT,
    );
    const legacySelectedEffect = draft.selectedVisualEffectId ?? 'none';
    const nextFilterId = isFilterEffectId(
      draft.selectedFilterEffectId ?? legacySelectedEffect,
    )
      ? ((draft.selectedFilterEffectId ??
          legacySelectedEffect) as FilterEffectId)
      : 'none';
    const nextBlurId = isBlurEffectId(
      draft.selectedBlurEffectId ?? legacySelectedEffect,
    )
      ? ((draft.selectedBlurEffectId ?? legacySelectedEffect) as BlurEffectId)
      : 'none';
    setSelectedFilterEffectId(nextFilterId);
    setSelectedBlurEffectId(nextBlurId);
    setSelectedLayer(null);
    setOutlinedLayer(null);
    setActiveLayer(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateDraft() {
      setIsHydratingDraft(true);
      setDraftReady(false);
      setMessage(null);
      if (!activity || !activityDraftKey) {
        resetDraftStateToDefaults();
        if (!cancelled) {
          setDraftReady(true);
          setIsHydratingDraft(false);
        }
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(activityDraftKey);
        if (cancelled) return;

        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          const draft = sanitizePreviewDraft(parsed, {
            templateIds: LAYOUTS.map((item) => item.id),
            fontIds: FONT_PRESETS.map((item) => item.id),
            defaults: {
              selectedLayoutId: LAYOUTS[0].id,
              selectedFontId: FONT_PRESETS[0].id,
              distanceUnit: 'km',
              elevationUnit: 'm',
              routeMode: 'trace',
              routeMapVariant: 'standard',
              primaryField: 'distance',
              visible: DEFAULT_VISIBLE_FIELDS,
              headerVisible: DEFAULT_HEADER_VISIBLE,
              visibleLayers: DEFAULT_VISIBLE_LAYERS,
              isSquareFormat: false,
            },
          });
          if (draft) {
            applyDraft(draft);
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (!cancelled) {
              setDraftReady(true);
              setIsHydratingDraft(false);
            }
            return;
          }
        }

        resetDraftStateToDefaults();
        if (activityPhotoUri) {
          const asset: ImagePicker.ImagePickerAsset = {
            uri: activityPhotoUri,
            width: STORY_WIDTH,
            height: STORY_HEIGHT,
            type: 'image',
          };
          await applyImageBackground(asset, { silent: true });
        }
      } catch {
        resetDraftStateToDefaults();
      } finally {
        if (!cancelled) {
          setDraftReady(true);
          setIsHydratingDraft(false);
        }
      }
    }

    void hydrateDraft();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id, activityDraftKey, activityPhotoUri]);

  useEffect(() => {
    if (!draftReady || !activityDraftKey || isHydratingDraft || templateMode) {
      return;
    }

    const draft: PreviewDraft = {
      v: 1,
      media,
      backgroundGradient,
      autoSubjectUri,
      imageOverlays,
      selectedLayoutId,
      selectedFontId,
      distanceUnit,
      elevationUnit,
      routeMode,
      routeMapVariant,
      primaryField,
      visible,
      headerVisible,
      layerOrder,
      visibleLayers,
      behindSubjectLayers,
      layerTransforms,
      isSquareFormat,
      layerStyleMap,
      layerStyleMapByLayout,
      sunsetPrimaryGradient,
      selectedFilterEffectId,
      selectedBlurEffectId,
      selectedVisualEffectId:
        selectedBlurEffectId !== 'none'
          ? selectedBlurEffectId
          : selectedFilterEffectId,
    };

    const timeout = setTimeout(() => {
      void AsyncStorage.setItem(activityDraftKey, JSON.stringify(draft)).catch(
        () => {},
      );
    }, 180);

    return () => clearTimeout(timeout);
  }, [
    activityDraftKey,
    autoSubjectUri,
    backgroundGradient,
    behindSubjectLayers,
    distanceUnit,
    elevationUnit,
    draftReady,
    headerVisible,
    imageOverlays,
    isSquareFormat,
    layerOrder,
    media,
    routeMapVariant,
    routeMode,
    primaryField,
    selectedFontId,
    selectedLayoutId,
    visible,
    visibleLayers,
    layerTransforms,
    layerStyleMap,
    layerStyleMapByLayout,
    sunsetPrimaryGradient,
    selectedFilterEffectId,
    selectedBlurEffectId,
    isHydratingDraft,
    templateMode,
  ]);

  useFocusEffect(
    useCallback(() => {
      setActivePanel('background');
      setPanelOpen(false);
      setSelectedLayer(null);
      setOutlinedLayer(null);
      setActiveLayer(null);
    }, []),
  );

  function selectLayer(layer: LayerId) {
    setSelectedLayer(layer);
    setOutlinedLayer(layer);
  }

  useEffect(() => {
    if (routeMode === 'off' && selectedLayer === 'route') {
      setSelectedLayer('stats');
      setOutlinedLayer('stats');
    }
  }, [routeMode, selectedLayer]);

  useEffect(() => {
    if (hasRouteLayer) return;
    setRouteMode('off');
    setVisibleLayers((prev) => (prev.route ? { ...prev, route: false } : prev));
    setBehindSubjectLayers((prev) =>
      prev.route ? { ...prev, route: false } : prev,
    );
    if (selectedLayer === 'route') {
      setSelectedLayer('stats');
      setOutlinedLayer('stats');
    }
  }, [hasRouteLayer, selectedLayer]);

  useEffect(() => {
    if (!supportsPrimaryLayer && selectedLayer === 'primary') {
      setSelectedLayer('stats');
      setOutlinedLayer('stats');
    }
  }, [selectedLayer, supportsPrimaryLayer]);

  useEffect(() => {
    if (templateMode) {
      if (!normalSnapshotRef.current) {
        normalSnapshotRef.current = {
          media,
          backgroundGradient,
          autoSubjectUri,
          imageOverlays,
          selectedLayoutId,
          routeMode,
          routeMapVariant,
          visible,
          headerVisible,
          primaryField,
          visibleLayers,
          layerOrder,
          layerTransforms,
          behindSubjectLayers,
          layerStyleMapByLayout,
        };
      }
      return;
    }

    if (!normalSnapshotRef.current) return;
    const snapshot = normalSnapshotRef.current;
    normalSnapshotRef.current = null;
    templatePresetAppliedRef.current = null;

    setMedia(snapshot.media);
    setBackgroundGradient(snapshot.backgroundGradient);
    setAutoSubjectUri(snapshot.autoSubjectUri);
    setImageOverlays(snapshot.imageOverlays);
    setSelectedLayoutId(snapshot.selectedLayoutId);
    setRouteMode(snapshot.routeMode);
    setRouteMapVariant(snapshot.routeMapVariant);
    setVisible(snapshot.visible);
    setHeaderVisible(snapshot.headerVisible);
    setPrimaryField(snapshot.primaryField);
    setVisibleLayers(snapshot.visibleLayers);
    setLayerOrder(snapshot.layerOrder);
    setLayerTransforms(snapshot.layerTransforms);
    setBehindSubjectLayers(snapshot.behindSubjectLayers);
    setLayerStyleMapByLayout(snapshot.layerStyleMapByLayout);
  }, [
    autoSubjectUri,
    backgroundGradient,
    behindSubjectLayers,
    headerVisible,
    imageOverlays,
    layerOrder,
    layerStyleMapByLayout,
    layerTransforms,
    media,
    primaryField,
    routeMapVariant,
    routeMode,
    selectedLayoutId,
    templateMode,
    visible,
    visibleLayers,
  ]);

  // Template presets can depend on activity photo, including subject extraction.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!templateMode || !selectedTemplateDefinition) {
      templatePresetAppliedRef.current = null;
      return;
    }

    const templateKey = `${activity?.id ?? 'none'}:${selectedTemplateDefinition.id}:${
      activityPhotoUri ?? 'no-photo'
    }`;
    if (templatePresetAppliedRef.current === templateKey) {
      return;
    }
    templatePresetAppliedRef.current = templateKey;

    if (
      selectedTemplateDefinition.defaultBackground === 'activity-photo' &&
      activityPhotoUri
    ) {
      const asset: ImagePicker.ImagePickerAsset = {
        uri: activityPhotoUri,
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        type: 'image',
      };
      void applyImageBackground(asset, {
        silent: true,
        skipBackgroundRemoval: Boolean(
          selectedTemplateDefinition.disableBackgroundRemoval,
        ),
      });
      return;
    }

    setMedia(null);
    setBackgroundGradient(null);
    setAutoSubjectUri(null);
  }, [
    activity?.id,
    activityPhotoUri,
    selectedTemplateDefinition,
    templateMode,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Guarded one-shot auto-heal effect. We intentionally avoid depending on
  // applyImageBackground to prevent re-trigger loops.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (templateMode) {
      autoExtractAttemptRef.current = null;
      return;
    }
    if (!draftReady || isHydratingDraft || isExtracting) return;
    if (!activity?.id || !activityPhotoUri || autoSubjectUri) return;

    const mediaMatchesActivityPhoto =
      media?.type === 'image' && media.uri === activityPhotoUri;
    const shouldApplyActivityPhotoByDefault = !media && !backgroundGradient;
    if (!mediaMatchesActivityPhoto && !shouldApplyActivityPhotoByDefault)
      return;

    const attemptKey = `${activity.id}:${activityPhotoUri}:${
      mediaMatchesActivityPhoto ? 'current-media' : 'empty-background'
    }`;
    if (autoExtractAttemptRef.current === attemptKey) return;
    autoExtractAttemptRef.current = attemptKey;

    const asset: ImagePicker.ImagePickerAsset =
      mediaMatchesActivityPhoto && media
        ? media
        : {
            uri: activityPhotoUri,
            width: STORY_WIDTH,
            height: STORY_HEIGHT,
            type: 'image',
          };
    void applyImageBackground(asset, { silent: true });
  }, [
    activity?.id,
    activityPhotoUri,
    autoSubjectUri,
    backgroundGradient,
    draftReady,
    isExtracting,
    isHydratingDraft,
    media,
    templateMode,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    let cancelled = false;
    async function resolveLocationFromLatLng() {
      setResolvedLocationText('');
      if (!activity?.start_latlng || activity.start_latlng.length < 2) return;

      const [latitude, longitude] = activity.start_latlng;
      try {
        const [result] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (cancelled || !result) return;

        const resolved = result.city?.trim() || '';
        setResolvedLocationText(resolved);
      } catch {
        if (!cancelled) setResolvedLocationText('');
      }
    }

    void resolveLocationFromLatLng();
    return () => {
      cancelled = true;
    };
  }, [activity]);

  useEffect(() => {
    const allHeaderFieldsHidden =
      !headerVisible.title && !headerVisible.date && !headerVisible.location;
    if (!allHeaderFieldsHidden || !visibleLayers.meta) return;

    setVisibleLayers((prev) => ({ ...prev, meta: false }));
    setBehindSubjectLayers((prev) => ({ ...prev, meta: false }));
    if (selectedLayer === 'meta') {
      selectLayer('stats');
    }
  }, [headerVisible, selectedLayer, visibleLayers.meta]);

  useEffect(() => {
    if (!helpPopoverOpen) return;
    void refreshAppCacheUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helpPopoverOpen]);

  useEffect(() => {
    if (hasSubjectFree) return;
    if (selectedBlurEffectId !== 'none') {
      setSelectedBlurEffectId('none');
    }
  }, [hasSubjectFree, selectedBlurEffectId]);

  useEffect(() => {
    if (hasFilterableBackground) return;
    if (selectedFilterEffectId !== 'none') {
      setSelectedFilterEffectId('none');
    }
    if (selectedBlurEffectId !== 'none') {
      setSelectedBlurEffectId('none');
    }
    if (activePanel === 'effects') {
      setActivePanel('background');
    }
  }, [
    activePanel,
    hasFilterableBackground,
    selectedBlurEffectId,
    selectedFilterEffectId,
  ]);

  if (!activity) {
    return (
      <View style={styles.centered}>
        <Text style={styles.note}>
          No selected activity. Go back and pick a run.
        </Text>
        <PrimaryButton
          label="Back to activities"
          onPress={() => router.replace('/activities')}
        />
      </View>
    );
  }

  async function ensureMediaPermission() {
    setMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Media library permission is required.');
      return false;
    }
    return true;
  }

  function trackManagedTempUri(uri: string | null | undefined) {
    if (!uri || !isAppOwnedCacheFile(uri)) return;
    managedTempUrisRef.current.add(uri);
  }

  async function cleanupTempUriIfOwned(uri: string | null | undefined) {
    if (!uri || !isAppOwnedCacheFile(uri)) {
      return;
    }

    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
      managedTempUrisRef.current.delete(uri);
    } catch {
      // Best effort cache cleanup only.
    }
  }

  async function directorySizeBytes(dirUri: string): Promise<number> {
    try {
      const entries = await FileSystem.readDirectoryAsync(dirUri);
      let total = 0;
      for (const name of entries) {
        const child = `${dirUri}${name}`;
        const info = await FileSystem.getInfoAsync(child);
        if (!info.exists) continue;
        if (info.isDirectory) {
          total += await directorySizeBytes(`${child}/`);
        } else if (typeof info.size === 'number') {
          total += info.size;
        }
      }
      return total;
    } catch {
      return 0;
    }
  }

  async function refreshAppCacheUsage() {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      setAppCacheUsageLabel('Cache: unavailable');
      return;
    }

    const bytes = await directorySizeBytes(cacheDir);
    const mb = bytes / (1024 * 1024);
    setAppCacheUsageLabel(`Cache: ${mb.toFixed(mb >= 100 ? 0 : 1)} MB`);
  }

  async function clearAppCache() {
    const keepUris = new Set(
      [
        media?.uri,
        autoSubjectUri,
        ...imageOverlays.map((item) => item.uri),
      ].filter((uri): uri is string =>
        Boolean(uri && uri.startsWith('file://')),
      ),
    );

    try {
      setMessage('Clearing cache...');
      const candidates = Array.from(managedTempUrisRef.current);
      for (const uri of candidates) {
        if (keepUris.has(uri)) continue;
        await cleanupTempUriIfOwned(uri);
      }
      await refreshAppCacheUsage();
      setMessage('Cache cleared.');
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `Could not clear cache (${err.message}).`
          : 'Could not clear cache.',
      );
    }
  }

  async function cleanupMediaIfTemp(
    asset: ImagePicker.ImagePickerAsset | null,
  ) {
    if (!asset) return;
    await cleanupTempUriIfOwned(asset.uri);
  }

  async function applyImageBackground(
    asset: ImagePicker.ImagePickerAsset,
    options: ApplyImageBackgroundOptions = {},
  ) {
    const previousMedia = media;
    const previousAutoSubjectUri = autoSubjectUri;
    setMedia(asset);
    setBackgroundGradient(null);
    setAutoSubjectUri(null);
    void cleanupMediaIfTemp(
      previousMedia?.uri === asset.uri ? null : previousMedia,
    );
    void cleanupTempUriIfOwned(previousAutoSubjectUri);

    const shouldSkipBackgroundRemoval =
      options.skipBackgroundRemoval ??
      (templateMode &&
        Boolean(
          getPreviewTemplateById(selectedTemplateId)?.disableBackgroundRemoval,
        ));
    if (shouldSkipBackgroundRemoval) {
      if (!options.silent) {
        setMessage(options.successMessage ?? 'Image loaded.');
      }
      return;
    }

    try {
      setIsExtracting(true);
      if (!options.silent) {
        setMessage('Extracting subject...');
      }
      const cutoutUri = await removeBackgroundOnDevice(asset.uri);
      trackManagedTempUri(cutoutUri);
      setAutoSubjectUri(cutoutUri);
      if (!options.silent) {
        setMessage(
          options.successMessage ?? 'Subject extracted automatically.',
        );
      }
    } catch (err) {
      if (!options.silent) {
        const details = err instanceof Error ? ` (${err.message})` : '';
        const prefix = options.failurePrefix ?? 'Image loaded.';
        setMessage(`${prefix} Subject extraction unavailable${details}.`);
      }
    } finally {
      setIsExtracting(false);
    }
  }

  async function pickImageMedia() {
    const allowed = await ensureMediaPermission();
    if (!allowed) return;
    try {
      const cropWidth =
        templateMode && selectedTemplateDefinition?.imagePickerCropSize?.width
          ? Math.max(1, Math.round(selectedTemplateDefinition.imagePickerCropSize.width))
          : 1080;
      const cropHeight =
        templateMode && selectedTemplateDefinition?.imagePickerCropSize?.height
          ? Math.max(1, Math.round(selectedTemplateDefinition.imagePickerCropSize.height))
          : isSquareFormat
            ? 1080
            : 1920;
      const cropResult = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        width: cropWidth,
        height: cropHeight,
        compressImageQuality: 1,
        forceJpg: true,
      });

      const asset: ImagePicker.ImagePickerAsset = {
        uri: normalizeLocalUri(cropResult.path),
        width: cropResult.width,
        height: cropResult.height,
        type: 'image',
        fileName: cropResult.filename ?? null,
        fileSize: cropResult.size ?? null,
        mimeType: cropResult.mime ?? null,
        duration: null,
        assetId: null,
        base64: null,
        exif: null,
      };
      trackManagedTempUri(asset.uri);
      await applyImageBackground(asset);
    } catch (err: any) {
      if (err?.code === 'E_PICKER_CANCELLED') return;
      setMessage(
        err instanceof Error ? err.message : 'Could not choose image.',
      );
    }
  }

  async function pickVideoMedia() {
    if (templateDisablesVideoBackground) {
      setMessage('Video background is disabled for this template.');
      return;
    }
    if (isSquareFormat) {
      setMessage('Video background is unavailable in square mode.');
      return;
    }

    const allowed = await ensureMediaPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'] as ImagePicker.MediaType[],
      quality: 1,
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
      videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;

    const previousMedia = media;
    const previousAutoSubjectUri = autoSubjectUri;
    const asset = result.assets[0];
    trackManagedTempUri(asset.uri);
    setMedia(asset);
    setBackgroundGradient(null);
    setAutoSubjectUri(null);
    void cleanupMediaIfTemp(
      previousMedia?.uri === asset.uri ? null : previousMedia,
    );
    void cleanupTempUriIfOwned(previousAutoSubjectUri);
    setMessage('Video loaded.');
  }

  async function addImageOverlay() {
    setMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Media library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    trackManagedTempUri(asset.uri);
    const { width: overlayWidth, height: overlayHeight } =
      getInitialOverlaySize(asset.width, asset.height);
    const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const layerId: LayerId = `image:${id}`;

    setImageOverlays((prev) => [
      ...prev,
      {
        id,
        uri: asset.uri,
        name: `Image ${prev.length + 1}`,
        opacity: 1,
        rotationDeg: 0,
        width: overlayWidth,
        height: overlayHeight,
      },
    ]);
    setVisibleLayers((prev) => ({ ...prev, [layerId]: true }));
    setLayerOrder((prev) => [...prev, layerId]);
    selectLayer(layerId);
  }

  async function createStickerOverlay() {
    setMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Media library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    try {
      setIsExtracting(true);
      setMessage('Creating sticker...');
      const stickerUri = await removeBackgroundOnDevice(asset.uri);
      trackManagedTempUri(stickerUri);
      const { width: overlayWidth, height: overlayHeight } =
        getInitialOverlaySize(asset.width, asset.height);
      const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
      const layerId: LayerId = `image:${id}`;

      setImageOverlays((prev) => [
        ...prev,
        {
          id,
          uri: stickerUri,
          name: `Sticker ${prev.length + 1}`,
          opacity: 1,
          rotationDeg: 0,
          width: overlayWidth,
          height: overlayHeight,
        },
      ]);
      setVisibleLayers((prev) => ({ ...prev, [layerId]: true }));
      setLayerOrder((prev) => [...prev, layerId]);
      selectLayer(layerId);
      setMessage('Sticker created.');
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `Could not create sticker (${err.message}).`
          : 'Could not create sticker.',
      );
    } finally {
      setIsExtracting(false);
    }
  }

  function toggleField(field: FieldId, value: boolean) {
    if (
      value &&
      supportsFullStatsPreview &&
      !effectiveVisible[field] &&
      selectedVisibleMetrics >= maxSelectableMetrics
    ) {
      setMessage(`This template supports ${templateMetricLimit} metrics max.`);
      return;
    }
    setVisible((prev) => ({ ...prev, [field]: value }));
  }

  function setPrimaryMetric(field: FieldId) {
    if (!supportsPrimaryLayer) return;
    if (!statsFieldAvailability[field]) {
      setMessage('This stat has no data for this activity.');
      return;
    }
    setPrimaryField(field);
    setVisible((prev) => ({ ...prev, [field]: true }));
    setVisibleLayers((prev) => ({ ...prev, primary: true }));
    selectLayer('primary');
  }

  function toggleHeaderField(
    field: 'title' | 'date' | 'location',
    value: boolean,
  ) {
    setHeaderVisible((prev) => ({ ...prev, [field]: value }));
  }

  function selectLayout(next: StatsLayout) {
    if (next.premium && !isPremium) {
      router.push('/paywall');
      return;
    }
    setSelectedLayoutId(next.id);
    if (next.layout === 'sunset-hero' || next.layout === 'morning-glass') {
      setVisible(getDefaultVisibleFieldsForLayout(next.layout));
    }
    if (
      next.layout === 'sunset-hero' ||
      next.layout === 'morning-glass' ||
      next.layout === 'split-bold'
    ) {
      setLayerTransforms((prev) => {
        const { stats: _stats, primary: _primary, ...rest } = prev;
        return rest;
      });
    }
  }

  function selectTemplate(templateId: string) {
    const nextTemplate = getPreviewTemplateById(templateId);
    if (!nextTemplate) return;
    if (nextTemplate.premium && !isPremium) {
      router.push('/paywall');
      return;
    }
    setSelectedTemplateId(nextTemplate.id);
  }

  function cycleStatsLayout() {
    const currentIndex = LAYOUTS.findIndex((item) => item.id === template.id);
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % LAYOUTS.length : 0;
    selectLayout(LAYOUTS[nextIndex]);
  }

  function changeTemplate(direction: 'next' | 'prev') {
    if (!templateMode || PREVIEW_TEMPLATES.length <= 1 || busy) return;
    const currentIndex = PREVIEW_TEMPLATES.findIndex(
      (item) => item.id === selectedTemplateId,
    );
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      direction === 'next'
        ? (safeIndex + 1) % PREVIEW_TEMPLATES.length
        : (safeIndex - 1 + PREVIEW_TEMPLATES.length) % PREVIEW_TEMPLATES.length;
    const nextTemplate = PREVIEW_TEMPLATES[nextIndex];
    if (!nextTemplate) return;
    selectTemplate(nextTemplate.id);
  }

  function cycleRouteMode() {
    if (!hasRouteLayer) return;
    if (routeMode === 'off') return;
    if (routeMode === 'trace') {
      setRouteMode('map');
      setRouteMapVariant('standard');
      return;
    }
    if (routeMode === 'map' && routeMapVariant === 'standard') {
      setRouteMapVariant('dark');
      return;
    }
    if (routeMode === 'map' && routeMapVariant === 'dark') {
      setRouteMapVariant('satellite');
      return;
    }
    setRouteMode('trace');
    setRouteMapVariant('standard');
  }

  function reorderLayers(
    entries: { id: LayerId; label: string; isBehind: boolean }[],
  ) {
    // entries are displayed front -> back, while layerOrder stores back -> front
    setLayerOrder(
      entries
        .map((entry) => entry.id)
        .slice()
        .reverse(),
    );
    setBehindSubjectLayers(
      entries.reduce(
        (acc, entry) => (entry.isBehind ? { ...acc, [entry.id]: true } : acc),
        {} as Partial<Record<LayerId, boolean>>,
      ),
    );
  }

  function setLayerBehindSubject(layerId: LayerId, value: boolean) {
    setBehindSubjectLayers((prev) => ({ ...prev, [layerId]: value }));
  }

  function onLayerTransformChange(
    layerId: LayerId,
    next: { x: number; y: number; scale: number; rotationDeg: number },
  ) {
    setLayerTransforms((prev) => ({ ...prev, [layerId]: next }));
  }

  function setLayerStyleColor(layerId: StyleLayerId, color: string) {
    setLayerStyleMapByLayout((prev) => {
      const current =
        prev[template.layout] ??
        getDefaultLayerStyleMapForLayout(template.layout);
      return {
        ...prev,
        [template.layout]: {
          ...current,
          [layerId]: { ...current[layerId], color },
        },
      };
    });
  }

  function setLayerStyleOpacity(layerId: StyleLayerId, opacity: number) {
    setLayerStyleMapByLayout((prev) => {
      const current =
        prev[template.layout] ??
        getDefaultLayerStyleMapForLayout(template.layout);
      return {
        ...prev,
        [template.layout]: {
          ...current,
          [layerId]: { ...current[layerId], opacity },
        },
      };
    });
  }

  function applySunsetPrimaryGradient(nextGradient: SunsetPrimaryGradient) {
    setSunsetPrimaryGradient(nextGradient);
    setLayerStyleMapByLayout((prev) => {
      const current =
        prev[template.layout] ??
        getDefaultLayerStyleMapForLayout(template.layout);
      return {
        ...prev,
        [template.layout]: {
          ...current,
          primary: { ...current.primary, color: '#FFFFFF' },
        },
      };
    });
  }

  function toggleLayer(layerId: LayerId, value: boolean) {
    if (layerId === 'route') {
      if (!hasRouteLayer) return;
      if (value) {
        setRouteMode((prev) => (prev === 'off' ? 'trace' : prev));
        setRouteMapVariant((prev) => (routeMode === 'off' ? 'standard' : prev));
        setVisibleLayers((prev) => ({ ...prev, route: true }));
        setBehindSubjectLayers((prev) => ({ ...prev, route: false }));
        selectLayer('route');
      } else {
        setVisibleLayers((prev) => ({ ...prev, route: false }));
        setBehindSubjectLayers((prev) => ({ ...prev, route: false }));
        setRouteMode('off');
        setRouteMapVariant('standard');
        if (selectedLayer === 'route') {
          selectLayer('stats');
        }
      }
      return;
    }
    setVisibleLayers((prev) => ({ ...prev, [layerId]: value }));
  }

  function removeLayer(layerId: LayerId) {
    setVisibleLayers((prev) => ({ ...prev, [layerId]: false }));
    setBehindSubjectLayers((prev) => ({ ...prev, [layerId]: false }));
    if (layerId === 'route') {
      setRouteMode('off');
      setRouteMapVariant('standard');
    }
    if (layerId.startsWith('image:')) {
      const id = layerId.replace('image:', '');
      setImageOverlays((prev) => {
        const removed = prev.find((item) => item.id === id);
        const next = prev.filter((item) => item.id !== id);
        if (
          removed?.uri &&
          !next.some((item) => item.uri === removed.uri) &&
          media?.uri !== removed.uri &&
          autoSubjectUri !== removed.uri
        ) {
          void cleanupTempUriIfOwned(removed.uri);
        }
        return next;
      });
      setLayerOrder((prev) => prev.filter((item) => item !== layerId));
      setLayerTransforms((prev) => {
        const next = { ...prev };
        delete next[layerId];
        return next;
      });
    }
    if (selectedLayer === layerId) {
      selectLayer('stats');
    }
  }

  async function exportAndShare() {
    if (!exportRef.current) return;

    try {
      setBusy(true);
      setMessage(null);
      const includeOpaqueBackground =
        media?.type === 'image' || backgroundGradient !== null;
      setPngTransparentOnly(!includeOpaqueBackground);
      setIsExportingPng(true);
      await new Promise((resolve) => setTimeout(resolve, 80));

      const exportFormat = includeOpaqueBackground ? 'jpg' : 'png';
      const uri = await captureRef(exportRef, {
        format: exportFormat,
        quality: 1,
        result: 'tmpfile',
        width: EXPORT_PNG_WIDTH,
        height: exportHeight,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: includeOpaqueBackground ? 'image/jpeg' : 'image/png',
          dialogTitle: 'Share PaceFrame story',
        });
      } else {
        throw new Error('Sharing is not available on this device.');
      }

      setMessage(
        includeOpaqueBackground
          ? `JPG exported with background + layers (${EXPORT_PNG_WIDTH}x${exportHeight}).`
          : `PNG exported with transparent background + layers only (${EXPORT_PNG_WIDTH}x${exportHeight}).`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to export.');
    } finally {
      setIsExportingPng(false);
      setPngTransparentOnly(false);
      setBusy(false);
    }
  }

  async function exportVideo() {
    if (!media?.uri || media.type !== 'video') {
      setMessage('Choose a video first.');
      return;
    }

    if (Platform.OS !== 'ios') {
      setMessage('Video + layers export is currently available on iOS only.');
      return;
    }

    try {
      setBusy(true);
      setMessage(null);
      setMessage('Compositing video + layers...');

      setIsCapturingOverlay(true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const overlayUri = await captureRef(exportRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: EXPORT_PNG_WIDTH,
        height: exportHeight,
      });
      setIsCapturingOverlay(false);

      const composedVideoUri = await composeVideoWithOverlay({
        videoUri: media.uri,
        overlayUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(composedVideoUri, {
          dialogTitle: 'Share PaceFrame video + layers',
        });
      } else {
        throw new Error('Sharing is not available on this device.');
      }

      setMessage('Video ready to share.');
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Failed to export video + layers.',
      );
    } finally {
      setIsCapturingOverlay(false);
      setBusy(false);
    }
  }

  function clearBackgroundMedia() {
    const previousMedia = media;
    const previousAutoSubjectUri = autoSubjectUri;
    setMedia(null);
    setBackgroundGradient(null);
    setAutoSubjectUri(null);
    void cleanupMediaIfTemp(previousMedia);
    void cleanupTempUriIfOwned(previousAutoSubjectUri);
    setMessage('Transparent background selected.');
  }

  async function useActivityPhotoAsBackground() {
    if (!activityPhotoUri) {
      setMessage('This activity has no photo.');
      return;
    }
    const asset: ImagePicker.ImagePickerAsset = {
      uri: activityPhotoUri,
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      type: 'image',
    };
    await applyImageBackground(asset, {
      successMessage:
        'Activity photo applied. Subject extracted automatically.',
      failurePrefix: 'Activity photo applied.',
    });
  }

  function generateRandomGradientBackground() {
    applyGradientBackground(createRandomGradient());
    setMessage('Random gradient background generated.');
  }

  function applyGradientBackground(nextGradient: BackgroundGradient) {
    const previousMedia = media;
    const previousAutoSubjectUri = autoSubjectUri;
    setMedia(null);
    setAutoSubjectUri(null);
    setBackgroundGradient(nextGradient);
    void cleanupMediaIfTemp(previousMedia);
    void cleanupTempUriIfOwned(previousAutoSubjectUri);
  }

  function applyGradientPreset(gradient: BackgroundGradient) {
    applyGradientBackground(gradient);
    setMessage('Gradient applied.');
  }

  async function resetToDefault() {
    if (busy) return;
    setMessage(null);
    const previousMedia = media;
    const previousAutoSubjectUri = autoSubjectUri;
    const previousOverlayUris = imageOverlays.map((item) => item.uri);
    resetDraftStateToDefaults({ keepLayoutId: selectedLayoutId });
    void cleanupMediaIfTemp(previousMedia);
    void cleanupTempUriIfOwned(previousAutoSubjectUri);
    previousOverlayUris.forEach((uri) => {
      if (uri !== previousMedia?.uri && uri !== previousAutoSubjectUri) {
        void cleanupTempUriIfOwned(uri);
      }
    });

    if (activityPhotoUri) {
      const asset: ImagePicker.ImagePickerAsset = {
        uri: activityPhotoUri,
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        type: 'image',
      };
      await applyImageBackground(asset, { silent: true });
    }

    setMessage('Reset to default.');
  }

  function confirmResetToDefault() {
    if (busy) return;
    Alert.alert('Reset design?', 'All your modifications will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          void resetToDefault();
        },
      },
    ]);
  }

  function toggleSquareFormat() {
    if (!isSquareFormat && media?.type === 'video') {
      setMessage('Switch to an image background before square mode.');
      return;
    }
    setIsSquareFormat((prev) => !prev);
  }

  function triggerExport() {
    void (media?.type === 'video' ? exportVideo() : exportAndShare());
  }

  function toggleHelpPanel() {
    setHelpPopoverOpen((prev) => !prev);
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitleText}>
                {templateMode
                  ? (selectedTemplateDefinition?.name ?? 'Templates')
                  : 'Preview'}
              </Text>
              {templateMode ? (
                <View style={styles.headerTemplateNav}>
                  <Pressable
                    onPress={() => changeTemplate('prev')}
                    hitSlop={8}
                    style={[
                      styles.headerFormatButton,
                      (busy || PREVIEW_TEMPLATES.length <= 1) &&
                        styles.headerFormatButtonDisabled,
                    ]}
                    disabled={busy || PREVIEW_TEMPLATES.length <= 1}
                    accessibilityRole="button"
                    accessibilityLabel="Template précédent"
                  >
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={18}
                      color={colors.panelText}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => changeTemplate('next')}
                    hitSlop={8}
                    style={[
                      styles.headerFormatButton,
                      (busy || PREVIEW_TEMPLATES.length <= 1) &&
                        styles.headerFormatButtonDisabled,
                    ]}
                    disabled={busy || PREVIEW_TEMPLATES.length <= 1}
                    accessibilityRole="button"
                    accessibilityLabel="Template suivant"
                  >
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={18}
                      color={colors.panelText}
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {!templateMode ? (
                <Pressable
                  onPress={() => {
                    confirmResetToDefault();
                  }}
                  hitSlop={8}
                  style={[
                    styles.headerFormatButton,
                    busy ? styles.headerFormatButtonDisabled : null,
                  ]}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Reset to default"
                >
                  <MaterialCommunityIcons
                    name="restore"
                    size={18}
                    color={colors.panelText}
                  />
                </Pressable>
              ) : null}
              {!templateMode ? (
                <Pressable
                  onPress={toggleSquareFormat}
                  hitSlop={8}
                  style={[
                    styles.headerFormatButton,
                    (!isSquareFormat && media?.type === 'video') || busy
                      ? styles.headerFormatButtonDisabled
                      : null,
                  ]}
                  disabled={
                    busy || (!isSquareFormat && media?.type === 'video')
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSquareFormat
                      ? 'Square format (1:1)'
                      : 'Portrait format (9:16)'
                  }
                >
                  <MaterialCommunityIcons
                    name={isSquareFormat ? 'crop-square' : 'cellphone'}
                    size={18}
                    color={colors.panelText}
                  />
                </Pressable>
              ) : null}
              <Pressable
                onPress={toggleHelpPanel}
                hitSlop={8}
                style={[
                  styles.headerFormatButton,
                  helpPopoverOpen ? styles.headerHelpButtonActive : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <MaterialCommunityIcons
                  name="cog-outline"
                  size={18}
                  color={colors.panelText}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <PreviewEditorCanvas
          exportRef={exportRef}
          isSquareFormat={isSquareFormat}
          panelOpen={panelOpen}
          onCanvasTouch={() => {
            if (panelOpen) setPanelOpen(false);
            if (helpPopoverOpen) setHelpPopoverOpen(false);
            setOutlinedLayer(null);
          }}
          canvasDisplayWidth={canvasDisplayWidth}
          canvasDisplayHeight={canvasDisplayHeight}
          isCapturingOverlay={isCapturingOverlay}
          isExportingPng={isExportingPng}
          pngTransparentOnly={pngTransparentOnly}
          checkerTiles={checkerTiles}
          centerGuides={centerGuides}
          showRotationGuide={showRotationGuide}
          media={media}
          backgroundGradient={backgroundGradient}
          autoSubjectUri={autoSubjectUri}
          visibleLayers={activeVisibleLayers}
          selectedLayer={outlinedLayer}
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          setSelectedLayer={selectLayer}
          baseLayerZ={baseLayerZ}
          activityName={activity.name}
          dateText={dateText}
          locationText={locationText}
          headerVisible={activeHeaderVisible}
          template={template}
          fontPreset={fontPreset}
          effectiveVisible={statsVisibleForLayer}
          supportsPrimaryLayer={supportsPrimaryLayer}
          primaryVisible={Boolean(activeVisibleLayers.primary)}
          primaryField={primaryFieldEffective}
          primaryValueText={metricTextByField[primaryFieldEffective]}
          distanceText={distanceText}
          durationText={durationText}
          paceText={paceText}
          elevText={elevText}
          cadenceText={cadenceText}
          caloriesText={caloriesText}
          avgHeartRateText={avgHeartRateText}
          layerStyleSettings={activeLayerStyleMap}
          sunsetPrimaryGradient={sunsetPrimaryGradient}
          selectedFilterEffect={selectedFilterEffect}
          selectedBlurEffect={selectedBlurEffect}
          selectedFilterEffectId={activeFilterEffectId}
          selectedBlurEffectId={activeBlurEffectId}
          centeredStatsXDisplay={centeredStatsXDisplay}
          dynamicStatsWidthDisplay={dynamicStatsWidthDisplay}
          canvasScaleX={canvasScaleX}
          canvasScaleY={canvasScaleY}
          cycleStatsLayout={cycleStatsLayout}
          routeMode={activeRouteMode}
          routeMapVariant={activeRouteMapVariant}
          layerTransforms={activeLayerTransforms}
          onLayerTransformChange={onLayerTransformChange}
          routeInitialXDisplay={routeInitialXDisplay}
          routeInitialYDisplay={routeInitialYDisplay}
          routeLayerWidthDisplay={routeLayerWidthDisplay}
          routeLayerHeightDisplay={routeLayerHeightDisplay}
          activityPolyline={activityPolyline}
          cycleRouteMode={cycleRouteMode}
          imageOverlays={activeImageOverlays}
          imageOverlayMaxInitial={IMAGE_OVERLAY_MAX_INITIAL}
          isPremium={isPremium}
          quickTemplateMode={templateMode}
          templateFixedTextElements={templateFixedTextElements}
          templateBackgroundMediaFrame={templateBackgroundMediaFrame}
          onDragGuideChange={setCenterGuides}
          onRotationGuideChange={setShowRotationGuide}
        />

        <PreviewEditorPanel
          panelOpen={panelOpen}
          setPanelOpen={setPanelOpen}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          busy={busy}
          isExtracting={isExtracting}
          onPickImage={pickImageMedia}
          onPickVideo={pickVideoMedia}
          activityPhotoUri={activityPhotoUri}
          onUseActivityPhotoBackground={useActivityPhotoAsBackground}
          onClearBackground={clearBackgroundMedia}
          onGenerateGradient={generateRandomGradientBackground}
          currentBackgroundGradient={backgroundGradient}
          gradientPresets={BACKGROUND_GRADIENT_PRESETS}
          onApplyGradientPreset={applyGradientPreset}
          onAddImageOverlay={addImageOverlay}
          onCreateSticker={createStickerOverlay}
          isSquareFormat={isSquareFormat}
          layerEntries={layerEntries}
          routeMode={activeRouteMode}
          visibleLayers={activeVisibleLayers}
          selectedLayer={selectedLayer}
          setSelectedLayer={selectLayer}
          onToggleLayer={toggleLayer}
          onReorderLayers={reorderLayers}
          onSetLayerBehindSubject={setLayerBehindSubject}
          onRemoveLayer={removeLayer}
          template={template}
          onSelectLayout={selectLayout}
          templateOptions={PREVIEW_TEMPLATES.map((item) => ({
            id: item.id,
            name: item.name,
            premium: item.premium,
          }))}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={selectTemplate}
          selectedFontId={selectedFontId}
          onSelectFont={setSelectedFontId}
          effectiveVisible={effectiveVisible}
          supportsFullStatsPreview={supportsFullStatsPreview}
          statsFieldAvailability={statsFieldAvailability}
          supportsPrimaryLayer={supportsPrimaryLayer}
          primaryField={activePrimaryField}
          onSetPrimaryField={setPrimaryMetric}
          maxOptionalMetrics={maxSelectableMetrics}
          selectedOptionalMetrics={selectedVisibleMetrics}
          onToggleField={toggleField}
          headerVisible={activeHeaderVisible}
          onToggleHeaderField={toggleHeaderField}
          distanceUnit={distanceUnit}
          onSetDistanceUnit={setDistanceUnit}
          elevationUnit={elevationUnit}
          onSetElevationUnit={setElevationUnit}
          layerStyleMap={activeLayerStyleMap}
          onSetLayerStyleColor={setLayerStyleColor}
          onSetLayerStyleOpacity={setLayerStyleOpacity}
          sunsetPrimaryGradient={sunsetPrimaryGradient}
          sunsetPrimaryGradientPresets={SUNSET_PRIMARY_GRADIENT_PRESETS}
          onSetSunsetPrimaryGradient={applySunsetPrimaryGradient}
          visualEffectPresets={VISUAL_EFFECT_PRESETS}
          selectedFilterEffectId={activeFilterEffectId}
          selectedBlurEffectId={activeBlurEffectId}
          onSetFilterEffect={(effectId) =>
            setSelectedFilterEffectId(effectId as FilterEffectId)
          }
          onSetBlurEffect={(effectId) =>
            setSelectedBlurEffectId(effectId as BlurEffectId)
          }
          hasSubjectFree={hasSubjectFree}
          effectsEnabled={hasFilterableBackground}
          isPremium={isPremium}
          message={message}
          appCacheUsageLabel={appCacheUsageLabel}
          onClearAppCache={() => {
            void clearAppCache();
          }}
          onOpenPaywall={() => router.push('/paywall')}
          onQuickExport={() => {
            if (busy) return;
            triggerExport();
          }}
          quickExportBusy={busy}
          helpPopoverOpen={helpPopoverOpen}
          onCloseHelpPopover={() => setHelpPopoverOpen(false)}
          quickTemplateMode={templateMode}
          allowVideoBackground={!templateDisablesVideoBackground}
        />
      </View>
    </>
  );
}

function getInitialOverlaySize(
  assetWidth?: number,
  assetHeight?: number,
): { width: number; height: number } {
  if (!assetWidth || !assetHeight) {
    return {
      width: IMAGE_OVERLAY_MAX_INITIAL,
      height: IMAGE_OVERLAY_MAX_INITIAL,
    };
  }

  const maxSide = IMAGE_OVERLAY_MAX_INITIAL;
  const ratio = assetWidth / assetHeight;
  let width = maxSide;
  let height = maxSide;

  if (ratio >= 1) {
    width = maxSide;
    height = width / ratio;
  } else {
    height = maxSide;
    width = height * ratio;
  }

  return {
    width: Math.max(IMAGE_OVERLAY_MIN_INITIAL, Math.round(width)),
    height: Math.max(IMAGE_OVERLAY_MIN_INITIAL, Math.round(height)),
  };
}

function formatPreviewDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatCadence(
  activity: {
    average_cadence?: number | null;
    type?: string | null;
  } | null,
) {
  const raw = activity?.average_cadence;
  if (!raw || raw <= 0) return '-- spm';

  const type = (activity?.type ?? '').toLowerCase();
  const isRunLike = type === 'run' || type === 'walk' || type === 'hike';

  // Strava cadence for run-like sports can come as strides/min; display as steps/min.
  if (isRunLike) {
    const spm = raw < 130 ? raw * 2 : raw;
    return `${Math.round(spm)} spm`;
  }

  return `${Math.round(raw)} rpm`;
}

function getDynamicStatsWidth(template: StatsLayout, visibleCount: number) {
  const count = Math.max(1, visibleCount);
  const compactCount = Math.min(4, count);

  switch (template.layout) {
    case 'hero':
    case 'glass-row': {
      if (compactCount >= 4) return template.width;
      if (compactCount === 3) return Math.max(220, template.width - 24);
      if (compactCount === 2) return Math.max(170, template.width - 78);
      return Math.max(220, template.width - 52);
    }
    case 'sunset-hero':
      // Keep cards readable even with only 1-2 metrics visible.
      return template.width;
    case 'morning-glass':
      return template.width;
    case 'split-bold': {
      // Keep split-bold compact: this layer should stay as a narrow right column.
      if (count >= 5) return 208;
      if (count === 4) return 202;
      if (count === 3) return 194;
      if (count === 2) return 184;
      return 170;
    }
    case 'compact':
    case 'pill-inline':
      return Math.max(
        150,
        Math.round(template.width * (0.45 + compactCount * 0.14)),
      );
    case 'columns':
    case 'card-columns':
      return Math.max(
        160,
        Math.round(template.width * (0.42 + compactCount * 0.145)),
      );
    case 'grid-2x2':
    case 'panel-grid':
      if (compactCount >= 4) return template.width;
      if (compactCount === 3) return Math.max(220, template.width - 28);
      if (compactCount === 2) return Math.max(160, template.width - 110);
      return 130;
    case 'vertical':
    case 'soft-stack':
    default:
      return Math.max(
        130,
        Math.round(template.width * (0.42 + compactCount * 0.145)),
      );
  }
}

function getLayoutMetricLimit(template: StatsLayout) {
  switch (template.layout) {
    case 'sunset-hero':
      return 5;
    case 'morning-glass':
      return 6;
    case 'split-bold':
      return 6;
    default:
      return 4;
  }
}

function createRandomGradient(): BackgroundGradient {
  const baseHue = Math.round(Math.random() * 359);
  const hueStep = 38 + Math.round(Math.random() * 46);
  const direction = Math.random() > 0.5 ? 'vertical' : 'horizontal';

  const colorA = hslToHex(baseHue, 76, 54);
  const colorB = hslToHex((baseHue + hueStep) % 360, 70, 50);
  const colorC = hslToHex((baseHue + hueStep * 2) % 360, 74, 58);

  return {
    colors: [colorA, colorB, colorC],
    direction,
  };
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue >= 0 && hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.panelSurfaceAlt,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitleText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.panelText,
    },
    headerTemplateNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerFormatButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.panelSurface,
      borderWidth: 1,
      borderColor: colors.panelBorder,
    },
    headerFormatButtonDisabled: {
      opacity: 0.5,
    },
    headerExportButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    headerHelpButtonActive: {
      borderColor: colors.primaryBorderOnLight,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      padding: 16,
      gap: 16,
      backgroundColor: colors.background,
    },
    note: {
      color: colors.panelTextMuted,
    },
  });
}
