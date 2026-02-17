import type * as ImagePicker from 'expo-image-picker';
import type { DistanceUnit } from '@/lib/format';
import type {
  BackgroundGradient,
  FieldId,
  ImageOverlay,
  LayerId,
  RouteMapVariant,
  RouteMode,
  StatsLayoutKind,
} from '@/types/preview';

export const BASE_LAYER_ORDER: LayerId[] = ['route', 'stats', 'primary', 'meta'];

export type LayerTransform = {
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
};

type StyleLayerId = 'meta' | 'stats' | 'route' | 'primary';
type LayerStyleSettings = {
  color: string;
  opacity: number;
};
type LayerStyleMap = Record<StyleLayerId, LayerStyleSettings>;
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

export type PreviewDraft = {
  v: 1;
  media: ImagePicker.ImagePickerAsset | null;
  backgroundGradient: BackgroundGradient | null;
  autoSubjectUri: string | null;
  imageOverlays: ImageOverlay[];
  selectedLayoutId: string;
  selectedFontId: string;
  distanceUnit: DistanceUnit;
  routeMode: RouteMode;
  routeMapVariant: RouteMapVariant;
  primaryField: FieldId;
  visible: Record<FieldId, boolean>;
  headerVisible: {
    title: boolean;
    date: boolean;
    location: boolean;
  };
  layerOrder: LayerId[];
  visibleLayers: Partial<Record<LayerId, boolean>>;
  behindSubjectLayers: Partial<Record<LayerId, boolean>>;
  layerTransforms: Partial<Record<LayerId, LayerTransform>>;
  isSquareFormat: boolean;
  layerStyleMap?: LayerStyleMap;
  layerStyleMapByLayout?: Partial<Record<StatsLayoutKind, LayerStyleMap>>;
  sunsetPrimaryGradient?: [string, string, string];
  selectedFilterEffectId?: FilterEffectId;
  selectedBlurEffectId?: BlurEffectId;
  selectedVisualEffectId?: VisualEffectId;
};

type SanitizeOptions = {
  templateIds: string[];
  fontIds: string[];
  defaults: {
    selectedLayoutId: string;
    selectedFontId: string;
    distanceUnit: DistanceUnit;
    routeMode: RouteMode;
    routeMapVariant: RouteMapVariant;
    primaryField: FieldId;
    visible: Record<FieldId, boolean>;
    headerVisible: {
      title: boolean;
      date: boolean;
      location: boolean;
    };
    visibleLayers: Partial<Record<LayerId, boolean>>;
    isSquareFormat: boolean;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLayerId(value: string): value is LayerId {
  return (
    value === 'meta' ||
    value === 'stats' ||
    value === 'route' ||
    value === 'primary' ||
    value.startsWith('image:')
  );
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeMedia(input: unknown): ImagePicker.ImagePickerAsset | null {
  if (!isObject(input)) return null;
  const uri = asString(input.uri);
  if (!uri) return null;
  const type = input.type === 'video' ? 'video' : 'image';
  const duration =
    typeof input.duration === 'number' ? input.duration : undefined;
  const assetId = typeof input.assetId === 'string' ? input.assetId : undefined;
  const fileSize = typeof input.fileSize === 'number' ? input.fileSize : undefined;
  const mimeType = typeof input.mimeType === 'string' ? input.mimeType : undefined;
  return {
    uri,
    type,
    width: asNumber(input.width, 0),
    height: asNumber(input.height, 0),
    fileName:
      typeof input.fileName === 'string' || input.fileName === null
        ? input.fileName
        : null,
    fileSize,
    mimeType,
    duration,
    assetId,
    base64:
      typeof input.base64 === 'string' || input.base64 === null
        ? input.base64
        : null,
    exif: isObject(input.exif) ? input.exif : null,
  };
}

function sanitizeImageOverlays(input: unknown): ImageOverlay[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => isObject(item))
    .map((item, index) => {
      const id = asString(item.id, String(index));
      const uri = asString(item.uri);
      if (!uri) return null;
      return {
        id,
        uri,
        name: asString(item.name, `Image ${index + 1}`),
        opacity: Math.min(1, Math.max(0, asNumber(item.opacity, 1))),
        rotationDeg: asNumber(item.rotationDeg, 0),
        width: Math.max(1, asNumber(item.width, 180)),
        height: Math.max(1, asNumber(item.height, 180)),
      };
    })
    .filter((item): item is ImageOverlay => Boolean(item));
}

function sanitizeGradient(input: unknown): BackgroundGradient | null {
  if (!isObject(input)) return null;
  if (!Array.isArray(input.colors) || input.colors.length !== 3) return null;
  const colors = input.colors.map((color) => asString(color));
  if (colors.some((color) => !color)) return null;
  const direction =
    input.direction === 'horizontal' ? 'horizontal' : 'vertical';
  return { colors: colors as [string, string, string], direction };
}

function sanitizeLayerOrder(input: unknown): LayerId[] {
  if (!Array.isArray(input)) return [...BASE_LAYER_ORDER];
  const result: LayerId[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== 'string' || !isLayerId(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  for (const base of BASE_LAYER_ORDER) {
    if (!seen.has(base)) result.push(base);
  }
  return result;
}

function sanitizeLayerBoolMap(
  input: unknown,
): Partial<Record<LayerId, boolean>> {
  if (!isObject(input)) return {};
  const next: Partial<Record<LayerId, boolean>> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!isLayerId(key)) return;
    if (typeof value === 'boolean') {
      next[key] = value;
    }
  });
  return next;
}

function sanitizeLayerTransforms(
  input: unknown,
): Partial<Record<LayerId, LayerTransform>> {
  if (!isObject(input)) return {};
  const next: Partial<Record<LayerId, LayerTransform>> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!isLayerId(key) || !isObject(value)) return;
    next[key] = {
      x: asNumber(value.x, 0),
      y: asNumber(value.y, 0),
      scale: asNumber(value.scale, 1),
      rotationDeg: asNumber(value.rotationDeg, 0),
    };
  });
  return next;
}

function isStyleLayerId(value: string): value is StyleLayerId {
  return (
    value === 'meta' ||
    value === 'stats' ||
    value === 'route' ||
    value === 'primary'
  );
}

function sanitizeLayerStyleMap(input: unknown): LayerStyleMap | undefined {
  if (!isObject(input)) return undefined;
  const defaults: LayerStyleMap = {
    meta: { color: '#FFFFFF', opacity: 1 },
    stats: { color: '#FFFFFF', opacity: 1 },
    route: { color: '#D4FF54', opacity: 1 },
    primary: { color: '#FFFFFF', opacity: 1 },
  };
  const next: LayerStyleMap = { ...defaults };

  Object.entries(input).forEach(([key, value]) => {
    if (!isStyleLayerId(key) || !isObject(value)) return;
    const rawColor = asString(value.color).trim();
    const color = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(rawColor)
      ? rawColor
      : defaults[key].color;
    const opacity = Math.min(1, Math.max(0, asNumber(value.opacity, 1)));
    next[key] = { color, opacity };
  });

  return next;
}

function isStatsLayout(value: string): value is StatsLayoutKind {
  return (
    value === 'hero' ||
    value === 'vertical' ||
    value === 'compact' ||
    value === 'columns' ||
    value === 'grid-2x2' ||
    value === 'glass-row' ||
    value === 'soft-stack' ||
    value === 'pill-inline' ||
    value === 'card-columns' ||
    value === 'panel-grid' ||
    value === 'sunset-hero' ||
    value === 'morning-glass' ||
    value === 'split-bold'
  );
}

function sanitizeLayerStyleMapByLayout(
  input: unknown,
): Partial<Record<StatsLayoutKind, LayerStyleMap>> | undefined {
  if (!isObject(input)) return undefined;
  const next: Partial<Record<StatsLayoutKind, LayerStyleMap>> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!isStatsLayout(key)) return;
    const sanitized = sanitizeLayerStyleMap(value);
    if (!sanitized) return;
    next[key] = sanitized;
  });
  return Object.keys(next).length ? next : undefined;
}

function sanitizeSunsetPrimaryGradient(
  input: unknown,
): [string, string, string] | undefined {
  if (!Array.isArray(input) || input.length !== 3) return undefined;
  const colors = input.map((value) => asString(value).trim());
  if (
    colors.some(
      (color) => !/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(color),
    )
  ) {
    return undefined;
  }
  return colors as [string, string, string];
}

function sanitizeVisualEffectId(input: unknown): VisualEffectId | undefined {
  if (
    input === 'none' ||
    input === 'black-and-white' ||
    input === 'bw-soft' ||
    input === 'warm-sunset' ||
    input === 'cool-night' ||
    input === 'background-blur' ||
    input === 'background-radial-blur' ||
    input === 'background-motion-blur'
  ) {
    return input;
  }
  return undefined;
}

function sanitizeFilterEffectId(input: unknown): FilterEffectId | undefined {
  if (
    input === 'none' ||
    input === 'black-and-white' ||
    input === 'bw-soft' ||
    input === 'warm-sunset' ||
    input === 'cool-night'
  ) {
    return input;
  }
  return undefined;
}

function sanitizeBlurEffectId(input: unknown): BlurEffectId | undefined {
  if (
    input === 'none' ||
    input === 'background-blur' ||
    input === 'background-radial-blur' ||
    input === 'background-motion-blur'
  ) {
    return input;
  }
  return undefined;
}

function sanitizeVisible(
  input: unknown,
  fallback: Record<FieldId, boolean>,
): Record<FieldId, boolean> {
  if (!isObject(input)) return { ...fallback };
  return {
    distance: asBoolean(input.distance, fallback.distance),
    time: asBoolean(input.time, fallback.time),
    pace: asBoolean(input.pace, fallback.pace),
    elev: asBoolean(input.elev, fallback.elev),
    cadence: asBoolean(input.cadence, fallback.cadence),
    calories: asBoolean(input.calories, fallback.calories),
    avgHr: asBoolean(input.avgHr, fallback.avgHr),
  };
}

function sanitizeHeaderVisible(
  input: unknown,
  fallback: { title: boolean; date: boolean; location: boolean },
) {
  if (!isObject(input)) return { ...fallback };
  return {
    title: asBoolean(input.title, fallback.title),
    date: asBoolean(input.date, fallback.date),
    location: asBoolean(input.location, fallback.location),
  };
}

export function sanitizePreviewDraft(
  input: unknown,
  options: SanitizeOptions,
): PreviewDraft | null {
  if (!isObject(input) || input.v !== 1) return null;

  const selectedLayoutId = asString(input.selectedLayoutId);
  const selectedFontId = asString(input.selectedFontId);
  const sanitizedLayoutId = options.templateIds.includes(selectedLayoutId)
    ? selectedLayoutId
    : options.defaults.selectedLayoutId;
  const sanitizedFontId = options.fontIds.includes(selectedFontId)
    ? selectedFontId
    : options.defaults.selectedFontId;
  const distanceUnit: DistanceUnit =
    input.distanceUnit === 'mi' ? 'mi' : options.defaults.distanceUnit;
  const routeMode: RouteMode =
    input.routeMode === 'trace' || input.routeMode === 'map'
      ? input.routeMode
      : options.defaults.routeMode;
  const routeMapVariant: RouteMapVariant =
    input.routeMapVariant === 'dark' || input.routeMapVariant === 'satellite'
      ? input.routeMapVariant
      : options.defaults.routeMapVariant;
  const primaryField: FieldId =
    input.primaryField === 'time' ||
    input.primaryField === 'pace' ||
    input.primaryField === 'elev' ||
    input.primaryField === 'cadence' ||
    input.primaryField === 'calories' ||
    input.primaryField === 'avgHr'
      ? input.primaryField
      : options.defaults.primaryField;
  const imageOverlays = sanitizeImageOverlays(input.imageOverlays);
  const overlayLayerIds = new Set(
    imageOverlays.map((item) => `image:${item.id}` as LayerId),
  );
  const keepLayerKey = (layerId: LayerId) =>
    layerId === 'meta' ||
    layerId === 'stats' ||
    layerId === 'primary' ||
    layerId === 'route' ||
    overlayLayerIds.has(layerId);
  const layerOrder = sanitizeLayerOrder(input.layerOrder).filter(keepLayerKey);
  const visibleLayers = sanitizeLayerBoolMap(input.visibleLayers);
  const behindSubjectLayers = sanitizeLayerBoolMap(input.behindSubjectLayers);
  const layerTransforms = sanitizeLayerTransforms(input.layerTransforms);
  const layerStyleMap = sanitizeLayerStyleMap(input.layerStyleMap);
  const layerStyleMapByLayout = sanitizeLayerStyleMapByLayout(
    input.layerStyleMapByLayout,
  );
  const sunsetPrimaryGradient = sanitizeSunsetPrimaryGradient(
    input.sunsetPrimaryGradient,
  );
  const selectedVisualEffectId = sanitizeVisualEffectId(
    input.selectedVisualEffectId,
  );
  const selectedFilterEffectId =
    sanitizeFilterEffectId(input.selectedFilterEffectId) ??
    sanitizeFilterEffectId(selectedVisualEffectId) ??
    'none';
  const selectedBlurEffectId =
    sanitizeBlurEffectId(input.selectedBlurEffectId) ??
    sanitizeBlurEffectId(selectedVisualEffectId) ??
    'none';

  return {
    v: 1,
    media: sanitizeMedia(input.media),
    backgroundGradient: sanitizeGradient(input.backgroundGradient),
    autoSubjectUri: asString(input.autoSubjectUri) || null,
    imageOverlays,
    selectedLayoutId: sanitizedLayoutId,
    selectedFontId: sanitizedFontId,
    distanceUnit,
    routeMode,
    routeMapVariant,
    primaryField,
    visible: sanitizeVisible(input.visible, options.defaults.visible),
    headerVisible: sanitizeHeaderVisible(
      input.headerVisible,
      options.defaults.headerVisible,
    ),
    layerOrder,
    visibleLayers: {
      ...options.defaults.visibleLayers,
      ...Object.fromEntries(
        Object.entries(visibleLayers).filter(([key]) =>
          keepLayerKey(key as LayerId),
        ),
      ),
    },
    behindSubjectLayers: Object.fromEntries(
      Object.entries(behindSubjectLayers).filter(([key]) =>
        keepLayerKey(key as LayerId),
      ),
    ) as Partial<Record<LayerId, boolean>>,
    layerTransforms: Object.fromEntries(
      Object.entries(layerTransforms).filter(([key]) =>
        keepLayerKey(key as LayerId),
      ),
    ) as Partial<Record<LayerId, LayerTransform>>,
    isSquareFormat: asBoolean(
      input.isSquareFormat,
      options.defaults.isSquareFormat,
    ),
    layerStyleMap,
    layerStyleMapByLayout,
    sunsetPrimaryGradient,
    selectedFilterEffectId,
    selectedBlurEffectId,
    selectedVisualEffectId,
  };
}
