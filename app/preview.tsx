import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { DraggableBlock } from '@/components/DraggableBlock';
import { RouteLayer } from '@/components/RouteLayer';
import { StatsLayerContent } from '@/components/StatsLayerContent';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing } from '@/constants/theme';
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
const ROUTE_LAYER_INITIAL_X = (STORY_WIDTH - ROUTE_LAYER_WIDTH) / 2;
const ROUTE_LAYER_INITIAL_Y = (STORY_HEIGHT - ROUTE_LAYER_HEIGHT) / 2;
const IMAGE_OVERLAY_MAX_INITIAL = 180;
const IMAGE_OVERLAY_MIN_INITIAL = 90;
const EXPORT_PNG_WIDTH = 1080;
const EXPORT_PNG_HEIGHT = Math.round((EXPORT_PNG_WIDTH * STORY_HEIGHT) / STORY_WIDTH);

export default function PreviewScreen() {
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
  const distanceText = formatDistanceMeters(activity?.distance ?? 0, distanceUnit);
  const durationText = formatDuration(activity?.moving_time ?? 0);
  const paceText = formatPace(
    activity?.distance ?? 0,
    activity?.moving_time ?? 0,
    distanceUnit,
  );
  const elevText = `${Math.round(activity?.total_elevation_gain ?? 0)} m`;
  const dateText = activity ? formatDate(activity.start_date) : '';
  const layerZ = useMemo(() => {
    return layerOrder.reduce(
      (acc, id, index) => ({ ...acc, [id]: index + 1 }),
      {} as Partial<Record<LayerId, number>>,
    );
  }, [layerOrder]);
  const baseLayerZ = (id: LayerId) =>
    behindSubjectLayers[id] ? 2 : (layerZ[id] ?? 1) * 10 + 10;
  const checkerTiles = useMemo(() => {
    const cols = Math.ceil(STORY_WIDTH / CHECKER_SIZE);
    const rows = Math.ceil(STORY_HEIGHT / CHECKER_SIZE);
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
  }, []);

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
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % TEMPLATES.length : 0;
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

  function updateImageLayer(layerId: LayerId, patch: Partial<ImageOverlay>) {
    if (!layerId.startsWith('image:')) return;
    const id = layerId.replace('image:', '');
    setImageOverlays((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.editorWrap}>
        <View
          collapsable={false}
          ref={exportRef}
          style={[
            styles.storyCanvas,
            (isCapturingOverlay || isExportingPng) && styles.storyCanvasSquare,
            (isCapturingOverlay || isExportingPng) && styles.storyCanvasNoBorder,
            (isCapturingOverlay || (isExportingPng && pngTransparentOnly)) &&
              styles.storyCanvasTransparent,
          ]}
        >
          {!isExportingPng && !isCapturingOverlay ? (
            <View pointerEvents="none" style={styles.checkerboardBase}>
              {checkerTiles.map((tile) => (
                <View
                  key={tile.key}
                  style={[
                    styles.checkerTile,
                    tile.dark
                      ? styles.checkerTileDark
                      : styles.checkerTileLight,
                    { left: tile.left, top: tile.top },
                  ]}
                />
              ))}
            </View>
          ) : null}
          {centerGuides.showVertical ? (
            <View pointerEvents="none" style={styles.centerGuideVertical} />
          ) : null}
          {centerGuides.showHorizontal ? (
            <View pointerEvents="none" style={styles.centerGuideHorizontal} />
          ) : null}
          {showRotationGuide ? (
            <View pointerEvents="none" style={styles.rotationGuideBadge}>
              <Text style={styles.rotationGuideBadgeText}>0°</Text>
            </View>
          ) : null}

          {media?.type === 'video' ? (
            <Video
              source={{ uri: media.uri }}
              style={[
                styles.media,
                (isCapturingOverlay ||
                  (isExportingPng && pngTransparentOnly)) &&
                  styles.hiddenForCapture,
              ]}
              shouldPlay
              isLooping
              isMuted={false}
              resizeMode={ResizeMode.COVER}
            />
          ) : media?.uri ? (
            <Image
              source={{ uri: media.uri }}
              style={[
                styles.media,
                isExportingPng && pngTransparentOnly && styles.hiddenForCapture,
              ]}
              resizeMode="cover"
            />
          ) : null}
          {autoSubjectUri ? (
            <View pointerEvents="none" style={styles.autoSubjectLayer}>
              <Image
                source={{ uri: autoSubjectUri }}
                style={styles.media}
                resizeMode="cover"
              />
            </View>
          ) : null}

          {visibleLayers.meta ? (
            <DraggableBlock
              key="meta-layer"
              initialX={42}
              initialY={44}
              selected={activeLayer === 'meta'}
              outlineRadius={0}
              canvasWidth={STORY_WIDTH}
              canvasHeight={STORY_HEIGHT}
              onDragGuideChange={setCenterGuides}
              onRotationGuideChange={setShowRotationGuide}
              onSelect={() => setSelectedLayer('meta')}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'meta' : null)
              }
              style={[
                styles.metaBlock,
                {
                  zIndex: baseLayerZ('meta'),
                  elevation: baseLayerZ('meta'),
                },
              ]}
            >
              <Text style={styles.metaTitle}>{activity.name}</Text>
              <Text style={styles.metaSubtitle}>{dateText}</Text>
            </DraggableBlock>
          ) : null}

          {visibleLayers.stats ? (
            <DraggableBlock
              key={template.id}
              initialX={template.x}
              initialY={template.y}
              selected={activeLayer === 'stats'}
              outlineRadius={template.radius}
              canvasWidth={STORY_WIDTH}
              canvasHeight={STORY_HEIGHT}
              onDragGuideChange={setCenterGuides}
              onRotationGuideChange={setShowRotationGuide}
              onSelect={() => setSelectedLayer('stats')}
              onTap={cycleStatsTemplate}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'stats' : null)
              }
              style={[
                styles.statsBlock,
                {
                  width: template.width,
                  backgroundColor: template.backgroundColor,
                  borderColor: template.borderColor,
                  borderWidth: template.borderWidth,
                  borderRadius: template.radius,
                  zIndex: baseLayerZ('stats'),
                  elevation: baseLayerZ('stats'),
                },
              ]}
            >
              <StatsLayerContent
                template={template}
                fontPreset={fontPreset}
                visible={visible}
                distanceText={distanceText}
                durationText={durationText}
                paceText={paceText}
                elevText={elevText}
              />
            </DraggableBlock>
          ) : null}

          {routeMode !== 'off' && visibleLayers.route ? (
            <DraggableBlock
              key="route-layer"
              initialX={ROUTE_LAYER_INITIAL_X}
              initialY={ROUTE_LAYER_INITIAL_Y}
              selected={activeLayer === 'route'}
              outlineRadius={0}
              canvasWidth={STORY_WIDTH}
              canvasHeight={STORY_HEIGHT}
              onDragGuideChange={setCenterGuides}
              onRotationGuideChange={setShowRotationGuide}
              onSelect={() => setSelectedLayer('route')}
              onTap={cycleRouteMode}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'route' : null)
              }
              style={[
                styles.routeBlock,
                {
                  zIndex: baseLayerZ('route'),
                  elevation: baseLayerZ('route'),
                },
              ]}
            >
              <RouteLayer
                polyline={activity.map.summary_polyline}
                mode={routeMode === 'map' ? 'map' : 'trace'}
                width={ROUTE_LAYER_WIDTH}
                height={ROUTE_LAYER_HEIGHT}
              />
            </DraggableBlock>
          ) : null}

          {imageOverlays.map((overlay, index) => {
            const layerId: LayerId = `image:${overlay.id}`;
            if (!visibleLayers[layerId]) return null;

            return (
              <DraggableBlock
                key={layerId}
                initialX={20 + index * 12}
                initialY={80 + index * 12}
                selected={activeLayer === layerId}
                outlineRadius={radius.lg}
                canvasWidth={STORY_WIDTH}
                canvasHeight={STORY_HEIGHT}
                onDragGuideChange={setCenterGuides}
                onRotationGuideChange={setShowRotationGuide}
                rotationDeg={overlay.rotationDeg}
                onSelect={() => setSelectedLayer(layerId)}
                onInteractionChange={(active) =>
                  setActiveLayer(active ? layerId : null)
                }
                style={[
                  styles.imageOverlayBlock,
                  {
                    width: overlay.width ?? IMAGE_OVERLAY_MAX_INITIAL,
                    height: overlay.height ?? IMAGE_OVERLAY_MAX_INITIAL,
                    zIndex: baseLayerZ(layerId),
                    elevation: baseLayerZ(layerId),
                    opacity: overlay.opacity,
                  },
                ]}
              >
                <Image
                  source={{ uri: overlay.uri }}
                  style={styles.imageOverlayImage}
                  resizeMode="cover"
                />
              </DraggableBlock>
            );
          })}

          {!isPremium ? <Text style={styles.watermark}>PACEFRAME</Text> : null}
        </View>
      </View>

      <View style={styles.mediaPickRow}>
        <View style={styles.mediaPickCell}>
          <PrimaryButton
            label={isExtracting ? 'Processing image...' : 'Choose image'}
            onPress={pickImageMedia}
            variant="secondary"
            disabled={busy || isExtracting}
          />
        </View>
        <View style={styles.mediaPickCell}>
          <PrimaryButton
            label="Choose video"
            onPress={pickVideoMedia}
            variant="secondary"
            disabled={busy}
          />
        </View>
        <View style={styles.mediaPickCell}>
          <PrimaryButton
            label="Clear background"
            onPress={clearBackgroundMedia}
            variant="secondary"
            disabled={busy}
          />
        </View>
      </View>
      <PrimaryButton
        label="Add image overlay"
        onPress={addImageOverlay}
        variant="secondary"
      />

      <Text style={styles.sectionTitle}>Layers</Text>
      <View style={styles.controls}>
        {(
          [
            ['meta', 'Header'],
            ['stats', 'Stats block'],
            ['route', 'Route block'],
            ...imageOverlays.map(
              (item) =>
                [`image:${item.id}` as LayerId, item.name] as [LayerId, string],
            ),
          ] as [LayerId, string][]
        ).map(([id, label]) => {
          const isRouteLayer = id === 'route';
          const switchValue = isRouteLayer
            ? routeMode !== 'off' && Boolean(visibleLayers.route)
            : Boolean(visibleLayers[id]);
          const isImageLayer = id.startsWith('image:');
          return (
            <View key={id} style={styles.layerRow}>
              <Pressable
                onPress={() => setSelectedLayer(id)}
                style={[
                  styles.layerNameBtn,
                  selectedLayer === id && styles.layerNameBtnSelected,
                ]}
              >
                <Text style={styles.controlLabel}>{label}</Text>
              </Pressable>
              <Switch
                value={switchValue}
                onValueChange={(value) => toggleLayer(id, value)}
              />
              <Pressable
                style={styles.layerAction}
                onPress={() => moveLayer(id, 'up')}
                hitSlop={10}
              >
                <Text style={styles.layerActionText}>↑</Text>
              </Pressable>
              <Pressable
                style={styles.layerAction}
                onPress={() => moveLayer(id, 'down')}
                hitSlop={10}
              >
                <Text style={styles.layerActionText}>↓</Text>
              </Pressable>
              {isImageLayer ? (
                <Pressable
                  style={styles.layerDelete}
                  onPress={() => removeLayer(id)}
                  hitSlop={10}
                >
                  <Text style={styles.layerDeleteText}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {selectedLayer.startsWith('image:') ? (
        <View style={styles.controls}>
          <Text style={styles.sectionTitle}>Image Layer Settings</Text>
          <View style={styles.layerAdjustRow}>
            <Text style={styles.controlLabel}>Opacity</Text>
            <Pressable
              style={styles.layerAction}
              onPress={() => {
                const id = selectedLayer;
                const layer = imageOverlays.find((x) => `image:${x.id}` === id);
                if (!layer) return;
                updateImageLayer(id, {
                  opacity: Math.max(0.1, layer.opacity - 0.1),
                });
              }}
            >
              <Text style={styles.layerActionText}>-</Text>
            </Pressable>
            <Text style={styles.adjustValue}>
              {Math.round(
                (imageOverlays.find((x) => `image:${x.id}` === selectedLayer)
                  ?.opacity ?? 1) * 100,
              )}
              %
            </Text>
            <Pressable
              style={styles.layerAction}
              onPress={() => {
                const id = selectedLayer;
                const layer = imageOverlays.find((x) => `image:${x.id}` === id);
                if (!layer) return;
                updateImageLayer(id, {
                  opacity: Math.min(1, layer.opacity + 0.1),
                });
              }}
            >
              <Text style={styles.layerActionText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.layerAdjustRow}>
            <Text style={styles.controlLabel}>Rotation</Text>
            <Pressable
              style={styles.layerAction}
              onPress={() => {
                const id = selectedLayer;
                const layer = imageOverlays.find((x) => `image:${x.id}` === id);
                if (!layer) return;
                updateImageLayer(id, { rotationDeg: layer.rotationDeg - 5 });
              }}
            >
              <Text style={styles.layerActionText}>-5°</Text>
            </Pressable>
            <Text style={styles.adjustValue}>
              {Math.round(
                imageOverlays.find((x) => `image:${x.id}` === selectedLayer)
                  ?.rotationDeg ?? 0,
              )}
              °
            </Text>
            <Pressable
              style={styles.layerAction}
              onPress={() => {
                const id = selectedLayer;
                const layer = imageOverlays.find((x) => `image:${x.id}` === id);
                if (!layer) return;
                updateImageLayer(id, { rotationDeg: layer.rotationDeg + 5 });
              }}
            >
              <Text style={styles.layerActionText}>+5°</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Template Block</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {TEMPLATES.map((item) => {
          const isLocked = item.premium && !isPremium;
          const selected = item.id === template.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => selectTemplate(item)}
            >
              <Text style={styles.chipText}>{item.name}</Text>
              {isLocked ? <Text style={styles.chipSub}>Premium</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>Font</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {FONT_PRESETS.map((item) => {
          const selected = item.id === fontPreset.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setSelectedFontId(item.id)}
            >
              <Text style={[styles.chipText, { fontFamily: item.family }]}>
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>Visible Infos</Text>
      <View style={styles.controls}>
        {(
          [
            ['distance', 'Distance'],
            ['time', 'Time'],
            ['pace', 'Pace'],
            ['elev', 'Elevation gain'],
          ] as [FieldId, string][]
        ).map(([id, label]) => (
          <View key={id} style={styles.switchRow}>
            <Text style={styles.controlLabel}>{label}</Text>
            <Switch
              value={visible[id]}
              onValueChange={(value) => toggleField(id, value)}
            />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Unit</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {(
          [
            { id: 'km', label: 'Kilometers' },
            { id: 'mi', label: 'Miles' },
          ] as { id: DistanceUnit; label: string }[]
        ).map((item) => {
          const selected = item.id === distanceUnit;
          return (
            <Pressable
              key={item.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setDistanceUnit(item.id)}
            >
              <Text style={styles.chipText}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.note}>
        Pinch and drag blocks to resize and place them. Center guide lines
        appear when aligned. Press ↓ at the bottom to place a layer behind the
        auto subject. Tap the route layer to switch between trace and map.
      </Text>
      {message ? <Text style={styles.note}>{message}</Text> : null}

      {!isPremium ? (
        <PrimaryButton
          label="Unlock Premium Templates"
          onPress={() => router.push('/paywall')}
          variant="secondary"
        />
      ) : null}

      <PrimaryButton
        label={busy ? 'Exporting...' : 'Export PNG'}
        onPress={exportAndShare}
        disabled={busy}
      />
      {media?.type === 'video' ? (
        <PrimaryButton
          label={busy ? 'Exporting...' : 'Export video + layers'}
          onPress={exportVideo}
          disabled={busy}
          variant="secondary"
        />
      ) : null}
    </ScrollView>
  );
}

function getInitialOverlaySize(
  assetWidth?: number,
  assetHeight?: number,
): { width: number; height: number } {
  if (!assetWidth || !assetHeight) {
    return { width: IMAGE_OVERLAY_MAX_INITIAL, height: IMAGE_OVERLAY_MAX_INITIAL };
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  editorWrap: {
    alignItems: 'center',
  },
  storyCanvas: {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: colors.border,
  },
  storyCanvasSquare: {
    borderRadius: 0,
  },
  storyCanvasNoBorder: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  storyCanvasTransparent: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  media: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
    elevation: 0,
  },
  checkerboardBase: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    opacity: 1,
  },
  checkerTile: {
    position: 'absolute',
    width: CHECKER_SIZE,
    height: CHECKER_SIZE,
  },
  checkerTileDark: {
    backgroundColor: '#060606',
  },
  checkerTileLight: {
    backgroundColor: '#111111',
  },
  centerGuideVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    marginLeft: -0.5,
    backgroundColor: 'rgba(34,211,238,0.95)',
    zIndex: 999,
    elevation: 999,
  },
  centerGuideHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    marginTop: -0.5,
    backgroundColor: 'rgba(34,211,238,0.95)',
    zIndex: 999,
    elevation: 999,
  },
  rotationGuideBadge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(34,211,238,0.95)',
    zIndex: 1000,
    elevation: 1000,
  },
  rotationGuideBadgeText: {
    color: '#00131A',
    fontWeight: '800',
    fontSize: 12,
  },
  hiddenForCapture: {
    opacity: 0,
  },
  autoSubjectLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 5,
    elevation: 5,
  },
  statsBlock: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'stretch',
  },
  metaBlock: {
    width: 240,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  metaSubtitle: {
    color: '#E5E7EB',
    fontSize: 12,
    marginTop: 2,
  },
  metaTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  routeBlock: {
    padding: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  imageOverlayBlock: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  imageOverlayImage: {
    width: '100%',
    height: '100%',
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  chipRow: {
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 116,
  },
  chipSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  chipText: {
    color: colors.text,
    fontWeight: '700',
  },
  chipSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    gap: spacing.sm,
  },
  mediaPickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  mediaPickCell: {
    flex: 1,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  layerNameBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  layerNameBtnSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  layerAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  layerActionText: {
    color: colors.text,
    fontWeight: '800',
  },
  layerDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  layerDeleteText: {
    color: '#DC2626',
    fontWeight: '800',
  },
  layerAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustValue: {
    minWidth: 56,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  controlLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  note: {
    color: colors.textMuted,
  },
  watermark: {
    position: 'absolute',
    right: 14,
    bottom: 16,
    color: 'rgba(255,255,255,0.84)',
    fontWeight: '800',
    letterSpacing: 1,
    zIndex: 5000,
    elevation: 5000,
  },
});
