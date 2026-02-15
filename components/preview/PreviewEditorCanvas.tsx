import { RefObject } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { DraggableBlock } from '@/components/DraggableBlock';
import { RouteLayer } from '@/components/RouteLayer';
import { StatsLayerContent } from '@/components/StatsLayerContent';
import { colors, radius } from '@/constants/theme';
import { CHECKER_SIZE } from '@/lib/previewConfig';
import type {
  BackgroundGradient,
  FieldId,
  FontPreset,
  ImageOverlay,
  LayerId,
  RouteMapVariant,
  RouteMode,
  StatsTemplate,
} from '@/types/preview';

type GuideState = {
  showVertical: boolean;
  showHorizontal: boolean;
};
type HeaderVisibility = {
  title: boolean;
  date: boolean;
  location: boolean;
};

type Props = {
  exportRef: RefObject<View | null>;
  isSquareFormat: boolean;
  panelOpen: boolean;
  onCanvasTouch: () => void;
  canvasDisplayWidth: number;
  canvasDisplayHeight: number;
  isCapturingOverlay: boolean;
  isExportingPng: boolean;
  pngTransparentOnly: boolean;
  checkerTiles: { key: string; left: number; top: number; dark: boolean }[];
  centerGuides: GuideState;
  showRotationGuide: boolean;
  media: ImagePicker.ImagePickerAsset | null;
  backgroundGradient: BackgroundGradient | null;
  autoSubjectUri: string | null;
  visibleLayers: Partial<Record<LayerId, boolean>>;
  selectedLayer: LayerId | null;
  activeLayer: LayerId | null;
  setActiveLayer: (next: LayerId | null) => void;
  setSelectedLayer: (next: LayerId) => void;
  baseLayerZ: (id: LayerId) => number;
  activityName: string;
  dateText: string;
  locationText: string;
  headerVisible: HeaderVisibility;
  template: StatsTemplate;
  fontPreset: FontPreset;
  effectiveVisible: Record<FieldId, boolean>;
  distanceText: string;
  durationText: string;
  paceText: string;
  elevText: string;
  cadenceText: string;
  caloriesText: string;
  avgHeartRateText: string;
  centeredStatsXDisplay: number;
  dynamicStatsWidthDisplay: number;
  canvasScaleX: number;
  canvasScaleY: number;
  cycleStatsTemplate: () => void;
  routeMode: RouteMode;
  routeMapVariant: RouteMapVariant;
  layerTransforms: Partial<
    Record<
      LayerId,
      { x: number; y: number; scale: number; rotationDeg: number }
    >
  >;
  onLayerTransformChange: (
    layerId: LayerId,
    next: { x: number; y: number; scale: number; rotationDeg: number },
  ) => void;
  routeInitialXDisplay: number;
  routeInitialYDisplay: number;
  routeLayerWidthDisplay: number;
  routeLayerHeightDisplay: number;
  activityPolyline: string | null;
  cycleRouteMode: () => void;
  imageOverlays: ImageOverlay[];
  imageOverlayMaxInitial: number;
  isPremium: boolean;
  onDragGuideChange: (guides: GuideState) => void;
  onRotationGuideChange: (active: boolean) => void;
};

export function PreviewEditorCanvas({
  exportRef,
  isSquareFormat,
  panelOpen,
  onCanvasTouch,
  canvasDisplayWidth,
  canvasDisplayHeight,
  isCapturingOverlay,
  isExportingPng,
  pngTransparentOnly,
  checkerTiles,
  centerGuides,
  showRotationGuide,
  media,
  backgroundGradient,
  autoSubjectUri,
  visibleLayers,
  selectedLayer,
  activeLayer,
  setActiveLayer,
  setSelectedLayer,
  baseLayerZ,
  activityName,
  dateText,
  locationText,
  headerVisible,
  template,
  fontPreset,
  effectiveVisible,
  distanceText,
  durationText,
  paceText,
  elevText,
  cadenceText,
  caloriesText,
  avgHeartRateText,
  centeredStatsXDisplay,
  dynamicStatsWidthDisplay,
  canvasScaleX,
  canvasScaleY,
  cycleStatsTemplate,
  routeMode,
  routeMapVariant,
  layerTransforms,
  onLayerTransformChange,
  routeInitialXDisplay,
  routeInitialYDisplay,
  routeLayerWidthDisplay,
  routeLayerHeightDisplay,
  activityPolyline,
  cycleRouteMode,
  imageOverlays,
  imageOverlayMaxInitial,
  isPremium,
  onDragGuideChange,
  onRotationGuideChange,
}: Props) {
  const showSelectionOutline = !isCapturingOverlay && !isExportingPng;
  const usesSunsetHeader =
    template.layout === 'sunset-hero' || template.layout === 'morning-glass';
  const usesTemplateHeader =
    usesSunsetHeader || template.layout === 'split-bold';
  const hasHeaderContent =
    (headerVisible.title && activityName.length > 0) ||
    (headerVisible.date && dateText.length > 0) ||
    (headerVisible.location && locationText.length > 0);
  const headerMetaLine = [
    headerVisible.location ? locationText : null,
    headerVisible.date ? dateText : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.stageWrap,
        isSquareFormat ? styles.stageWrapCentered : styles.stageWrapTop,
      ]}
    >
      <View
        style={[
          styles.canvasScaleWrap,
          { width: canvasDisplayWidth, height: canvasDisplayHeight },
        ]}
      >
        <View
          collapsable={false}
          ref={exportRef}
          style={[
            styles.storyCanvas,
            { width: canvasDisplayWidth, height: canvasDisplayHeight },
            (isCapturingOverlay || isExportingPng) && styles.storyCanvasSquare,
            (isCapturingOverlay || isExportingPng) &&
              styles.storyCanvasNoBorder,
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
          {!media && backgroundGradient ? (
            <LinearGradient
              pointerEvents="none"
              colors={backgroundGradient.colors}
              start={
                backgroundGradient.direction === 'vertical'
                  ? { x: 0.5, y: 0 }
                  : { x: 0, y: 0.5 }
              }
              end={
                backgroundGradient.direction === 'vertical'
                  ? { x: 0.5, y: 1 }
                  : { x: 1, y: 0.5 }
              }
              style={[
                styles.gradientLayer,
                isExportingPng && pngTransparentOnly && styles.hiddenForCapture,
              ]}
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

          <Pressable style={styles.canvasTapCatcher} onPress={onCanvasTouch} />

          {visibleLayers.meta && hasHeaderContent ? (
            <DraggableBlock
              key="meta-layer"
              initialX={
                layerTransforms.meta?.x ??
                Math.max(0, Math.round((canvasDisplayWidth - 240) / 2))
              }
              initialY={
                layerTransforms.meta?.y ?? Math.round(44 * canvasScaleY)
              }
              initialScale={layerTransforms.meta?.scale ?? 1}
              rotationDeg={layerTransforms.meta?.rotationDeg ?? 0}
              selected={showSelectionOutline && selectedLayer === 'meta'}
              outlineRadius={0}
              canvasWidth={canvasDisplayWidth}
              canvasHeight={canvasDisplayHeight}
              onDragGuideChange={onDragGuideChange}
              onRotationGuideChange={onRotationGuideChange}
              onSelect={() => setSelectedLayer('meta')}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'meta' : null)
              }
              onTransformEnd={(next) => onLayerTransformChange('meta', next)}
              style={[
                styles.metaBlock,
                usesTemplateHeader ? styles.metaBlockSunset : null,
                { zIndex: baseLayerZ('meta'), elevation: baseLayerZ('meta') },
              ]}
            >
              {headerVisible.title ? (
                <Text
                  style={[
                    styles.metaTitle,
                    usesTemplateHeader ? styles.metaTitleSunset : null,
                    {
                      fontFamily: fontPreset.family,
                      fontWeight: fontPreset.weightTitle,
                    },
                  ]}
                >
                  {usesTemplateHeader ? activityName.toUpperCase() : activityName}
                </Text>
              ) : null}
              {usesTemplateHeader && headerVisible.title ? (
                <View style={styles.metaDividerSunset} />
              ) : null}
              {!usesTemplateHeader && headerMetaLine ? (
                <Text
                  style={[
                    styles.metaSubtitle,
                    {
                      fontFamily: fontPreset.family,
                      fontWeight: '400',
                    },
                  ]}
                >
                  {headerMetaLine}
                </Text>
              ) : null}
              {usesTemplateHeader && headerMetaLine ? (
                <Text
                  style={[
                    styles.metaSubtitle,
                    styles.metaSubtitleSunset,
                    {
                      fontFamily: fontPreset.family,
                      fontWeight: '400',
                    },
                  ]}
                >
                  {headerMetaLine}
                </Text>
              ) : null}
            </DraggableBlock>
          ) : null}

          {visibleLayers.stats ? (
            <DraggableBlock
              key="stats-layer"
              initialX={layerTransforms.stats?.x ?? centeredStatsXDisplay}
              initialY={
                layerTransforms.stats?.y ??
                Math.round(template.y * canvasScaleY)
              }
              initialScale={layerTransforms.stats?.scale ?? 1}
              rotationDeg={layerTransforms.stats?.rotationDeg ?? 0}
              selected={showSelectionOutline && selectedLayer === 'stats'}
              outlineRadius={template.radius}
              canvasWidth={canvasDisplayWidth}
              canvasHeight={canvasDisplayHeight}
              onDragGuideChange={onDragGuideChange}
              onRotationGuideChange={onRotationGuideChange}
              onSelect={() => setSelectedLayer('stats')}
              onTap={cycleStatsTemplate}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'stats' : null)
              }
              onTransformEnd={(next) => onLayerTransformChange('stats', next)}
              style={[
                styles.statsBlock,
                {
                  width: dynamicStatsWidthDisplay,
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
                visible={effectiveVisible}
                distanceText={distanceText}
                durationText={durationText}
                paceText={paceText}
                elevText={elevText}
                cadenceText={cadenceText}
                caloriesText={caloriesText}
                avgHeartRateText={avgHeartRateText}
              />
            </DraggableBlock>
          ) : null}

          {routeMode !== 'off' && visibleLayers.route ? (
            <DraggableBlock
              key="route-layer"
              initialX={layerTransforms.route?.x ?? routeInitialXDisplay}
              initialY={layerTransforms.route?.y ?? routeInitialYDisplay}
              initialScale={layerTransforms.route?.scale ?? 1}
              rotationDeg={layerTransforms.route?.rotationDeg ?? 0}
              selected={showSelectionOutline && selectedLayer === 'route'}
              outlineRadius={0}
              canvasWidth={canvasDisplayWidth}
              canvasHeight={canvasDisplayHeight}
              onDragGuideChange={onDragGuideChange}
              onRotationGuideChange={onRotationGuideChange}
              onSelect={() => setSelectedLayer('route')}
              onTap={cycleRouteMode}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'route' : null)
              }
              onTransformEnd={(next) => onLayerTransformChange('route', next)}
              style={[
                styles.routeBlock,
                { zIndex: baseLayerZ('route'), elevation: baseLayerZ('route') },
              ]}
            >
              <RouteLayer
                polyline={activityPolyline}
                mode={routeMode === 'map' ? 'map' : 'trace'}
                mapVariant={routeMapVariant}
                width={routeLayerWidthDisplay}
                height={routeLayerHeightDisplay}
              />
            </DraggableBlock>
          ) : null}

          {imageOverlays.map((overlay, index) => {
            const layerId: LayerId = `image:${overlay.id}`;
            if (!visibleLayers[layerId]) return null;

            return (
              <DraggableBlock
                key={layerId}
                initialX={
                  layerTransforms[layerId]?.x ??
                  Math.round((20 + index * 12) * canvasScaleX)
                }
                initialY={
                  layerTransforms[layerId]?.y ??
                  Math.round((80 + index * 12) * canvasScaleY)
                }
                initialScale={layerTransforms[layerId]?.scale ?? 1}
                selected={showSelectionOutline && selectedLayer === layerId}
                outlineRadius={0}
                canvasWidth={canvasDisplayWidth}
                canvasHeight={canvasDisplayHeight}
                onDragGuideChange={onDragGuideChange}
                onRotationGuideChange={onRotationGuideChange}
                rotationDeg={
                  layerTransforms[layerId]?.rotationDeg ?? overlay.rotationDeg
                }
                onSelect={() => setSelectedLayer(layerId)}
                onInteractionChange={(active) =>
                  setActiveLayer(active ? layerId : null)
                }
                onTransformEnd={(next) => onLayerTransformChange(layerId, next)}
                style={[
                  styles.imageOverlayBlock,
                  {
                    width: Math.round(
                      (overlay.width ?? imageOverlayMaxInitial) * canvasScaleX,
                    ),
                    height: Math.round(
                      (overlay.height ?? imageOverlayMaxInitial) * canvasScaleY,
                    ),
                    zIndex: baseLayerZ(layerId),
                    elevation: baseLayerZ(layerId),
                    opacity: overlay.opacity,
                  },
                ]}
              >
                <Image
                  source={{ uri: overlay.uri }}
                  style={styles.imageOverlayImage}
                  resizeMode="contain"
                />
              </DraggableBlock>
            );
          })}

          {!isPremium ? <Text style={styles.watermark}>PACEFRAME</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stageWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  stageWrapTop: {
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  stageWrapCentered: {
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 120,
  },
  canvasScaleWrap: {
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  storyCanvas: {
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
  gradientLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
    elevation: 0,
    overflow: 'hidden',
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
  canvasTapCatcher: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
    elevation: 1,
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
  metaBlockSunset: {
    width: 280,
    paddingTop: 4,
  },
  metaSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaSubtitleSunset: {
    color: 'rgba(235,235,242,0.9)',
    fontSize: 13,
    letterSpacing: 0.2,
    marginTop: 6,
  },
  metaLocation: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaTitleSunset: {
    fontSize: 24,
    letterSpacing: 2.2,
    marginBottom: 6,
  },
  metaDividerSunset: {
    width: '82%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },
  routeBlock: {
    padding: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  imageOverlayBlock: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  imageOverlayImage: {
    width: '100%',
    height: '100%',
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
