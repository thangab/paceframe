import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
import { removeBackgroundOnDevice } from '@/lib/backgroundRemoval';
import { composeVideoWithOverlay } from '@/lib/nativeVideoComposer';
import {
  DistanceUnit,
  formatDate,
  formatDistanceMeters,
  formatDuration,
  formatPace,
} from '@/lib/format';
import { useActivityStore } from '@/store/activityStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import {
  FieldId,
  ImageOverlay,
  LayerId,
  RouteMode,
  StatsTemplate,
} from '@/types/preview';

const ROUTE_LAYER_WIDTH = 280;
const ROUTE_LAYER_HEIGHT = 180;
const IMAGE_OVERLAY_MAX_INITIAL = 180;
const IMAGE_OVERLAY_MIN_INITIAL = 90;
const EXPORT_PNG_WIDTH = 1080;
const EXPORT_PNG_HEIGHT = 1920;

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
  const [autoSubjectUri, setAutoSubjectUri] = useState<string | null>(null);
  const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const [selectedFontId, setSelectedFontId] = useState(FONT_PRESETS[0].id);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [routeMode, setRouteMode] = useState<RouteMode>('off');
  const [visible, setVisible] = useState<Record<FieldId, boolean>>({
    distance: true,
    time: true,
    pace: true,
    elev: true,
  });
  const [layerOrder, setLayerOrder] = useState<LayerId[]>([
    'meta',
    'stats',
    'route',
  ]);
  const [visibleLayers, setVisibleLayers] = useState<
    Partial<Record<LayerId, boolean>>
  >({
    meta: true,
    stats: true,
    route: true,
  });
  const [behindSubjectLayers, setBehindSubjectLayers] = useState<
    Partial<Record<LayerId, boolean>>
  >({});
  const [selectedLayer, setSelectedLayer] = useState<LayerId>('stats');
  const [activeLayer, setActiveLayer] = useState<LayerId | null>(null);
  const [activePanel, setActivePanel] = useState<PreviewPanelTab>('background');
  const [panelOpen, setPanelOpen] = useState(true);

  const exportRef = useRef<View>(null);

  const template = useMemo(
    () =>
      TEMPLATES.find((item) => item.id === selectedTemplateId) ?? TEMPLATES[0],
    [selectedTemplateId],
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
  const dateText = activity ? formatDate(activity.start_date) : '';
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
  const effectiveVisible = useMemo<Record<FieldId, boolean>>(
    () =>
      supportsFullStatsPreview
        ? { ...visible, distance: true }
        : {
            distance: false,
            time: true,
            pace: false,
            elev: false,
          },
    [supportsFullStatsPreview, visible],
  );
  const visibleStatsCount = useMemo(
    () =>
      (effectiveVisible.distance ? 1 : 0) +
      (effectiveVisible.time ? 1 : 0) +
      (effectiveVisible.pace ? 1 : 0) +
      (effectiveVisible.elev ? 1 : 0),
    [effectiveVisible],
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
  const layerEntries = useMemo(
    () =>
      [
        ['meta', 'Header'],
        ['stats', 'Stats block'],
        ['route', 'Route block'],
        ...imageOverlays.map(
          (item) =>
            [`image:${item.id}` as LayerId, item.name] as [LayerId, string],
        ),
      ] as [LayerId, string][],
    [imageOverlays],
  );
  const canvasDisplaySize = useMemo(() => {
    // Keep exact story ratio while fitting visible space above the bottom overlay.
    const ratio = STORY_WIDTH / STORY_HEIGHT;
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
  }, [screenHeight, screenWidth]);
  const canvasDisplayWidth = canvasDisplaySize.width;
  const canvasDisplayHeight = canvasDisplaySize.height;
  const canvasRelativeScale = useMemo(
    () => canvasDisplayWidth / STORY_WIDTH,
    [canvasDisplayWidth],
  );
  const dynamicStatsWidthDisplay = useMemo(
    () => Math.round(dynamicStatsWidth * canvasRelativeScale),
    [canvasRelativeScale, dynamicStatsWidth],
  );
  const centeredStatsXDisplay = useMemo(
    () => Math.round((canvasDisplayWidth - dynamicStatsWidthDisplay) / 2),
    [canvasDisplayWidth, dynamicStatsWidthDisplay],
  );
  const routeLayerWidthDisplay = useMemo(
    () => Math.round(ROUTE_LAYER_WIDTH * canvasRelativeScale),
    [canvasRelativeScale],
  );
  const routeLayerHeightDisplay = useMemo(
    () => Math.round(ROUTE_LAYER_HEIGHT * canvasRelativeScale),
    [canvasRelativeScale],
  );
  const routeInitialXDisplay = useMemo(
    () => Math.round((canvasDisplayWidth - routeLayerWidthDisplay) / 2),
    [canvasDisplayWidth, routeLayerWidthDisplay],
  );
  const routeInitialYDisplay = useMemo(
    () => Math.round((canvasDisplayHeight - routeLayerHeightDisplay) / 2),
    [canvasDisplayHeight, routeLayerHeightDisplay],
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

  useEffect(() => {
    if (routeMode === 'off' && selectedLayer === 'route') {
      setSelectedLayer('stats');
    }
  }, [routeMode, selectedLayer]);

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

  async function pickImageMedia() {
    const allowed = await ensureMediaPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 1,
      allowsEditing: false,
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setMedia(asset);
    setAutoSubjectUri(null);

    try {
      setIsExtracting(true);
      setMessage('Extracting subject...');
      const cutoutUri = await removeBackgroundOnDevice(asset.uri);
      setAutoSubjectUri(cutoutUri);
      setMessage('Subject extracted automatically.');
    } catch (err) {
      const details = err instanceof Error ? ` (${err.message})` : '';
      setMessage(`Image loaded. Subject extraction unavailable${details}.`);
    } finally {
      setIsExtracting(false);
    }
  }

  async function pickVideoMedia() {
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

    const asset = result.assets[0];
    setMedia(asset);
    setAutoSubjectUri(null);
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
    setSelectedLayer(layerId);
  }

  function toggleField(field: FieldId, value: boolean) {
    if (field === 'distance' && !value) {
      return;
    }
    setVisible((prev) => ({ ...prev, [field]: value }));
  }

  function selectTemplate(next: StatsTemplate) {
    if (next.premium && !isPremium) {
      router.push('/paywall');
      return;
    }
    setSelectedTemplateId(next.id);
  }

  function cycleStatsTemplate() {
    const currentIndex = TEMPLATES.findIndex((item) => item.id === template.id);
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % TEMPLATES.length : 0;
    selectTemplate(TEMPLATES[nextIndex]);
  }

  function cycleRouteMode() {
    if (routeMode === 'off') return;
    setRouteMode((prev) => (prev === 'map' ? 'trace' : 'map'));
  }

  function moveLayer(layerId: LayerId, direction: 'up' | 'down') {
    const current = layerOrder.indexOf(layerId);
    if (current === -1) return;

    // One extra step down from bottom sends the layer behind auto-subject.
    if (direction === 'down' && current === 0) {
      setBehindSubjectLayers((prev) => ({ ...prev, [layerId]: true }));
      return;
    }

    // One step up brings it back in front of auto-subject.
    if (direction === 'up' && behindSubjectLayers[layerId]) {
      setBehindSubjectLayers((prev) => ({ ...prev, [layerId]: false }));
      return;
    }

    setBehindSubjectLayers((prev) => ({ ...prev, [layerId]: false }));
    setLayerOrder((prev) => {
      const i = prev.indexOf(layerId);
      if (i === -1) return prev;
      const target = direction === 'up' ? i + 1 : i - 1;
      if (target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }

  function toggleLayer(layerId: LayerId, value: boolean) {
    if (layerId === 'route') {
      if (value) {
        setRouteMode((prev) => (prev === 'off' ? 'trace' : prev));
        setVisibleLayers((prev) => ({ ...prev, route: true }));
        setBehindSubjectLayers((prev) => ({ ...prev, route: false }));
        setSelectedLayer('route');
      } else {
        setVisibleLayers((prev) => ({ ...prev, route: false }));
        setBehindSubjectLayers((prev) => ({ ...prev, route: false }));
        setRouteMode('off');
        if (selectedLayer === 'route') {
          setSelectedLayer('stats');
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
    }
    if (layerId.startsWith('image:')) {
      const id = layerId.replace('image:', '');
      setImageOverlays((prev) => prev.filter((item) => item.id !== id));
      setLayerOrder((prev) => prev.filter((item) => item !== layerId));
    }
    if (selectedLayer === layerId) {
      setSelectedLayer('stats');
    }
  }

  async function exportAndShare() {
    if (!exportRef.current) return;

    try {
      setBusy(true);
      setMessage(null);
      const includeImageBackground = media?.type === 'image';
      setPngTransparentOnly(!includeImageBackground);
      setIsExportingPng(true);
      await new Promise((resolve) => setTimeout(resolve, 80));

      const exportFormat = includeImageBackground ? 'jpg' : 'png';
      const uri = await captureRef(exportRef, {
        format: exportFormat,
        quality: 1,
        result: 'tmpfile',
        width: EXPORT_PNG_WIDTH,
        height: EXPORT_PNG_HEIGHT,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: includeImageBackground ? 'image/jpeg' : 'image/png',
          dialogTitle: 'Share PaceFrame story',
        });
      } else {
        throw new Error('Sharing is not available on this device.');
      }

      setMessage(
        includeImageBackground
          ? `JPG exported with image + layers (${EXPORT_PNG_WIDTH}x${EXPORT_PNG_HEIGHT}).`
          : `PNG exported with transparent background + layers only (${EXPORT_PNG_WIDTH}x${EXPORT_PNG_HEIGHT}).`,
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
      });
      setIsCapturingOverlay(false);

      const composedVideoUri = await composeVideoWithOverlay({
        videoUri: media.uri,
        overlayUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(composedVideoUri, {
          mimeType: 'video/mp4',
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
    setMedia(null);
    setAutoSubjectUri(null);
    setMessage('Transparent background selected.');
  }

  function triggerExport() {
    void (media?.type === 'video' ? exportVideo() : exportAndShare());
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => {
                if (busy) return;
                triggerExport();
              }}
              hitSlop={8}
              style={styles.headerExportButton}
            >
              <Text style={styles.headerExportText}>
                {busy ? '...' : 'Export'}
              </Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <PreviewEditorCanvas
          exportRef={exportRef}
          panelOpen={panelOpen}
          onCanvasTouch={() => {
            if (panelOpen) setPanelOpen(false);
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
          autoSubjectUri={autoSubjectUri}
          visibleLayers={visibleLayers}
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          setSelectedLayer={setSelectedLayer}
          baseLayerZ={baseLayerZ}
          activityName={activity.name}
          dateText={dateText}
          template={template}
          fontPreset={fontPreset}
          effectiveVisible={effectiveVisible}
          distanceText={distanceText}
          durationText={durationText}
          paceText={paceText}
          elevText={elevText}
          centeredStatsXDisplay={centeredStatsXDisplay}
          dynamicStatsWidthDisplay={dynamicStatsWidthDisplay}
          canvasRelativeScale={canvasRelativeScale}
          cycleStatsTemplate={cycleStatsTemplate}
          routeMode={routeMode}
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
          onClearBackground={clearBackgroundMedia}
          onAddImageOverlay={addImageOverlay}
          layerEntries={layerEntries}
          routeMode={routeMode}
          visibleLayers={visibleLayers}
          selectedLayer={selectedLayer}
          setSelectedLayer={setSelectedLayer}
          onToggleLayer={toggleLayer}
          onMoveLayer={moveLayer}
          onRemoveLayer={removeLayer}
          template={template}
          onSelectTemplate={selectTemplate}
          selectedFontId={selectedFontId}
          onSelectFont={setSelectedFontId}
          effectiveVisible={effectiveVisible}
          supportsFullStatsPreview={supportsFullStatsPreview}
          onToggleField={toggleField}
          distanceUnit={distanceUnit}
          onSetDistanceUnit={setDistanceUnit}
          isPremium={isPremium}
          message={message}
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

function getDynamicStatsWidth(template: StatsTemplate, visibleCount: number) {
  const count = Math.max(1, Math.min(4, visibleCount));

  switch (template.layout) {
    case 'row': {
      // Hero: distance + bottom row; keep wider when many metrics are visible.
      if (count >= 4) return template.width;
      if (count === 3) return Math.max(220, template.width - 24);
      if (count === 2) return Math.max(170, template.width - 78);
      return 140;
    }
    case 'inline':
      return Math.max(150, Math.round(template.width * (0.45 + count * 0.14)));
    case 'right':
      return Math.max(160, Math.round(template.width * (0.42 + count * 0.145)));
    case 'grid':
      if (count >= 4) return template.width;
      if (count === 3) return Math.max(220, template.width - 28);
      if (count === 2) return Math.max(160, template.width - 110);
      return 130;
    case 'stack':
    default:
      return Math.max(130, Math.round(template.width * (0.42 + count * 0.145)));
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0F12',
  },
  headerExportButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerExportText: {
    color: '#0E0F12',
    fontWeight: '800',
    fontSize: 16,
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
