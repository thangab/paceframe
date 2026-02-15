import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import ImageCropPicker from 'react-native-image-crop-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/theme';
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
  TEMPLATES,
} from '@/lib/previewConfig';
import {
  BASE_LAYER_ORDER,
  sanitizePreviewDraft,
  type PreviewDraft,
} from '@/lib/previewDraft';
import { removeBackgroundOnDevice } from '@/lib/backgroundRemoval';
import { composeVideoWithOverlay } from '@/lib/nativeVideoComposer';
import {
  DistanceUnit,
  formatDistanceMeters,
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
  RouteMapVariant,
  RouteMode,
  StatsTemplate,
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
const DEFAULT_HEADER_VISIBLE = {
  title: true,
  date: true,
  location: true,
};
const DEFAULT_VISIBLE_LAYERS: Partial<Record<LayerId, boolean>> = {
  meta: true,
  stats: true,
  primary: true,
  route: true,
};
const PREVIEW_DRAFT_KEY_PREFIX = 'paceframe.preview.draft.';

type ApplyImageBackgroundOptions = {
  silent?: boolean;
  successMessage?: string;
  failurePrefix?: string;
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

function isAppOwnedCacheFile(uri: string) {
  if (!uri.startsWith('file://')) return false;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return false;
  return uri.startsWith(cacheDir) || uri.includes('/Library/Caches/');
}

export default function PreviewScreen() {
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const [selectedFontId, setSelectedFontId] = useState(FONT_PRESETS[0].id);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
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
  const [isSquareFormat, setIsSquareFormat] = useState(false);
  const [resolvedLocationText, setResolvedLocationText] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [isHydratingDraft, setIsHydratingDraft] = useState(false);
  const [appCacheUsageLabel, setAppCacheUsageLabel] = useState('Cache: --');

  const exportRef = useRef<View>(null);
  const managedTempUrisRef = useRef<Set<string>>(new Set());

  const template = useMemo(
    () =>
      TEMPLATES.find((item) => item.id === selectedTemplateId) ?? TEMPLATES[0],
    [selectedTemplateId],
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
  const elevText = `${Math.round(activity?.total_elevation_gain ?? 0)} m`;
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
    () => getTemplateMetricLimit(template),
    [template],
  );
  const maxSelectableMetrics = Math.max(1, templateMetricLimit);
  const effectiveVisible = useMemo<Record<FieldId, boolean>>(
    () => {
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
        (field) => Boolean(visible[field]) && statsFieldAvailability[field],
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
    },
    [
      maxSelectableMetrics,
      statsFieldAvailability,
      supportsFullStatsPreview,
      visible,
    ],
  );
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
    if (effectiveVisible[primaryField] && statsFieldAvailability[primaryField]) {
      return primaryField;
    }
    const fallback = (
      ['distance', 'time', 'pace', 'elev', 'cadence', 'calories', 'avgHr'] as FieldId[]
    ).find((field) => effectiveVisible[field] && statsFieldAvailability[field]);
    return fallback ?? 'distance';
  }, [effectiveVisible, primaryField, statsFieldAvailability, supportsPrimaryLayer]);
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
    return layerOrder.reduce(
      (acc, id, index) => ({ ...acc, [id]: index + 1 }),
      {} as Partial<Record<LayerId, number>>,
    );
  }, [layerOrder]);
  const baseLayerZ = (id: LayerId) =>
    behindSubjectLayers[id] ? 2 : (layerZ[id] ?? 1) * 10 + 10;
  const layerEntries = useMemo(() => {
    const labelMap = new Map<LayerId, string>([
      ['meta', 'Header'],
      ['stats', 'Stats'],
      ['primary', 'Primary'],
      ['route', 'Route'],
    ]);
    imageOverlays.forEach((item) => {
      labelMap.set(`image:${item.id}`, item.name);
    });
    return layerOrder
      .slice()
      .reverse()
      .filter((id) => (supportsPrimaryLayer ? true : id !== 'primary'))
      .map((id) => ({
        id,
        label: labelMap.get(id) ?? id,
        isBehind: Boolean(behindSubjectLayers[id]),
      }));
  }, [behindSubjectLayers, imageOverlays, layerOrder, supportsPrimaryLayer]);
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

  const activityDraftKey = useMemo(
    () =>
      activity ? `${PREVIEW_DRAFT_KEY_PREFIX}${String(activity.id)}` : null,
    [activity],
  );

  function resetDraftStateToDefaults() {
    setMedia(null);
    setBackgroundGradient(null);
    setAutoSubjectUri(null);
    setImageOverlays([]);
    setSelectedTemplateId(TEMPLATES[0].id);
    setSelectedFontId(FONT_PRESETS[0].id);
    setDistanceUnit('km');
    setRouteMode('trace');
    setRouteMapVariant('standard');
    setPrimaryField('distance');
    setVisible(DEFAULT_VISIBLE_FIELDS);
    setHeaderVisible(DEFAULT_HEADER_VISIBLE);
    setLayerOrder(BASE_LAYER_ORDER);
    setVisibleLayers(DEFAULT_VISIBLE_LAYERS);
    setBehindSubjectLayers({});
    setLayerTransforms({});
    setIsSquareFormat(false);
    setSelectedLayer(null);
    setOutlinedLayer(null);
    setActiveLayer(null);
  }

  function applyDraft(draft: PreviewDraft) {
    setMedia(draft.media ?? null);
    setBackgroundGradient(draft.backgroundGradient ?? null);
    setAutoSubjectUri(draft.autoSubjectUri ?? null);
    setImageOverlays(draft.imageOverlays ?? []);
    setSelectedTemplateId(draft.selectedTemplateId ?? TEMPLATES[0].id);
    setSelectedFontId(draft.selectedFontId ?? FONT_PRESETS[0].id);
    setDistanceUnit(draft.distanceUnit ?? 'km');
    setRouteMode(draft.routeMode ?? 'trace');
    setRouteMapVariant(draft.routeMapVariant ?? 'standard');
    setPrimaryField(draft.primaryField ?? 'distance');
    setVisible(draft.visible ?? DEFAULT_VISIBLE_FIELDS);
    setHeaderVisible(draft.headerVisible ?? DEFAULT_HEADER_VISIBLE);
    setLayerOrder(
      draft.layerOrder?.length ? draft.layerOrder : BASE_LAYER_ORDER,
    );
    setVisibleLayers({ ...DEFAULT_VISIBLE_LAYERS, ...(draft.visibleLayers ?? {}) });
    setBehindSubjectLayers(draft.behindSubjectLayers ?? {});
    setLayerTransforms(draft.layerTransforms ?? {});
    setIsSquareFormat(Boolean(draft.isSquareFormat));
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
            templateIds: TEMPLATES.map((item) => item.id),
            fontIds: FONT_PRESETS.map((item) => item.id),
            defaults: {
              selectedTemplateId: TEMPLATES[0].id,
              selectedFontId: FONT_PRESETS[0].id,
              distanceUnit: 'km',
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
  }, [activity?.id, activityDraftKey, activityPhotoUri]);

  useEffect(() => {
    if (!draftReady || !activityDraftKey || isHydratingDraft) return;

    const draft: PreviewDraft = {
      v: 1,
      media,
      backgroundGradient,
      autoSubjectUri,
      imageOverlays,
      selectedTemplateId,
      selectedFontId,
      distanceUnit,
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
    selectedTemplateId,
    visible,
    visibleLayers,
    layerTransforms,
    isHydratingDraft,
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
    if (!supportsPrimaryLayer && selectedLayer === 'primary') {
      setSelectedLayer('stats');
      setOutlinedLayer('stats');
    }
  }, [selectedLayer, supportsPrimaryLayer]);

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
    if (activePanel !== 'help' || !panelOpen) return;
    void refreshAppCacheUsage();
  }, [activePanel, panelOpen]);

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
      const cropResult = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        width: 1080,
        height: isSquareFormat ? 1080 : 1920,
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
      setMessage(
        `This template supports ${templateMetricLimit} metrics max.`,
      );
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

  function selectTemplate(next: StatsTemplate) {
    if (next.premium && !isPremium) {
      router.push('/paywall');
      return;
    }
    setSelectedTemplateId(next.id);
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

  function cycleStatsTemplate() {
    const currentIndex = TEMPLATES.findIndex((item) => item.id === template.id);
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % TEMPLATES.length : 0;
    selectTemplate(TEMPLATES[nextIndex]);
  }

  function cycleRouteMode() {
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

  function toggleLayer(layerId: LayerId, value: boolean) {
    if (layerId === 'route') {
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
    const previousMedia = media;
    const previousAutoSubjectUri = autoSubjectUri;
    setMedia(null);
    setAutoSubjectUri(null);
    setBackgroundGradient(createRandomGradient());
    void cleanupMediaIfTemp(previousMedia);
    void cleanupTempUriIfOwned(previousAutoSubjectUri);
    setMessage('Random gradient background generated.');
  }

  async function resetToDefault() {
    if (busy) return;
    setMessage(null);
    const previousMedia = media;
    const previousAutoSubjectUri = autoSubjectUri;
    const previousOverlayUris = imageOverlays.map((item) => item.uri);
    resetDraftStateToDefaults();
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

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  void resetToDefault();
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
                  color="#F3F4F6"
                />
              </Pressable>
              <Pressable
                onPress={toggleSquareFormat}
                hitSlop={8}
                style={[
                  styles.headerFormatButton,
                  (!isSquareFormat && media?.type === 'video') || busy
                    ? styles.headerFormatButtonDisabled
                    : null,
                ]}
                disabled={busy || (!isSquareFormat && media?.type === 'video')}
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
                  color="#F3F4F6"
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (busy) return;
                  triggerExport();
                }}
                hitSlop={8}
                style={styles.headerExportButton}
                accessibilityRole="button"
                accessibilityLabel="Export"
              >
                <MaterialCommunityIcons
                  name={busy ? 'dots-horizontal' : 'export-variant'}
                  size={20}
                  color="#0E0F12"
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
          visibleLayers={visibleLayers}
          selectedLayer={outlinedLayer}
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          setSelectedLayer={selectLayer}
          baseLayerZ={baseLayerZ}
          activityName={activity.name}
          dateText={dateText}
          locationText={locationText}
          headerVisible={headerVisible}
          template={template}
          fontPreset={fontPreset}
          effectiveVisible={statsVisibleForLayer}
          supportsPrimaryLayer={supportsPrimaryLayer}
          primaryVisible={Boolean(visibleLayers.primary)}
          primaryField={primaryFieldEffective}
          primaryValueText={metricTextByField[primaryFieldEffective]}
          distanceText={distanceText}
          durationText={durationText}
          paceText={paceText}
          elevText={elevText}
          cadenceText={cadenceText}
          caloriesText={caloriesText}
          avgHeartRateText={avgHeartRateText}
          centeredStatsXDisplay={centeredStatsXDisplay}
          dynamicStatsWidthDisplay={dynamicStatsWidthDisplay}
          canvasScaleX={canvasScaleX}
          canvasScaleY={canvasScaleY}
          cycleStatsTemplate={cycleStatsTemplate}
          routeMode={routeMode}
          routeMapVariant={routeMapVariant}
          layerTransforms={layerTransforms}
          onLayerTransformChange={onLayerTransformChange}
          routeInitialXDisplay={routeInitialXDisplay}
          routeInitialYDisplay={routeInitialYDisplay}
          routeLayerWidthDisplay={routeLayerWidthDisplay}
          routeLayerHeightDisplay={routeLayerHeightDisplay}
          activityPolyline={activity.map.summary_polyline}
          cycleRouteMode={cycleRouteMode}
          imageOverlays={imageOverlays}
          imageOverlayMaxInitial={IMAGE_OVERLAY_MAX_INITIAL}
          isPremium={isPremium}
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
          onAddImageOverlay={addImageOverlay}
          onCreateSticker={createStickerOverlay}
          isSquareFormat={isSquareFormat}
          layerEntries={layerEntries}
          routeMode={routeMode}
          visibleLayers={visibleLayers}
          selectedLayer={selectedLayer}
          setSelectedLayer={selectLayer}
          onToggleLayer={toggleLayer}
          onReorderLayers={reorderLayers}
          onSetLayerBehindSubject={setLayerBehindSubject}
          onRemoveLayer={removeLayer}
          template={template}
          onSelectTemplate={selectTemplate}
          selectedFontId={selectedFontId}
          onSelectFont={setSelectedFontId}
          effectiveVisible={effectiveVisible}
          supportsFullStatsPreview={supportsFullStatsPreview}
          statsFieldAvailability={statsFieldAvailability}
          supportsPrimaryLayer={supportsPrimaryLayer}
          primaryField={primaryField}
          onSetPrimaryField={setPrimaryMetric}
          maxOptionalMetrics={maxSelectableMetrics}
          selectedOptionalMetrics={selectedVisibleMetrics}
          onToggleField={toggleField}
          headerVisible={headerVisible}
          onToggleHeaderField={toggleHeaderField}
          distanceUnit={distanceUnit}
          onSetDistanceUnit={setDistanceUnit}
          isPremium={isPremium}
          message={message}
          appCacheUsageLabel={appCacheUsageLabel}
          onClearAppCache={() => {
            void clearAppCache();
          }}
          onOpenPaywall={() => router.push('/paywall')}
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

function getDynamicStatsWidth(template: StatsTemplate, visibleCount: number) {
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

function getTemplateMetricLimit(template: StatsTemplate) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0F12',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerFormatButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#232833',
    borderWidth: 1,
    borderColor: '#2F3644',
  },
  headerFormatButtonDisabled: {
    opacity: 0.5,
  },
  headerExportButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    gap: 16,
    backgroundColor: colors.background,
  },
  note: {
    color: '#A0A8B8',
  },
});
