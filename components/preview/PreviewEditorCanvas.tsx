import { RefObject } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import { ResizeMode, Video } from 'expo-av';
import { DraggableBlock } from '@/components/DraggableBlock';
import { RouteLayer } from '@/components/RouteLayer';
import { StatsLayerContent } from '@/components/StatsLayerContent';
import { colors, radius } from '@/constants/theme';
import { CHECKER_SIZE } from '@/lib/previewConfig';
import type {
  FieldId,
  FontPreset,
  ImageOverlay,
  LayerId,
  RouteMode,
  StatsTemplate,
} from '@/types/preview';

type GuideState = {
  showVertical: boolean;
  showHorizontal: boolean;
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
  autoSubjectUri: string | null;
  visibleLayers: Partial<Record<LayerId, boolean>>;
  activeLayer: LayerId | null;
  setActiveLayer: (next: LayerId | null) => void;
  setSelectedLayer: (next: LayerId) => void;
  baseLayerZ: (id: LayerId) => number;
  activityName: string;
  dateText: string;
  template: StatsTemplate;
  fontPreset: FontPreset;
  effectiveVisible: Record<FieldId, boolean>;
  distanceText: string;
  durationText: string;
  paceText: string;
  elevText: string;
  centeredStatsXDisplay: number;
  dynamicStatsWidthDisplay: number;
  canvasScaleX: number;
  canvasScaleY: number;
  cycleStatsTemplate: () => void;
  routeMode: RouteMode;
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
  autoSubjectUri,
  visibleLayers,
  activeLayer,
  setActiveLayer,
  setSelectedLayer,
  baseLayerZ,
  activityName,
  dateText,
  template,
  fontPreset,
  effectiveVisible,
  distanceText,
  durationText,
  paceText,
  elevText,
  centeredStatsXDisplay,
  dynamicStatsWidthDisplay,
  canvasScaleX,
  canvasScaleY,
  cycleStatsTemplate,
  routeMode,
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
          onTouchStart={onCanvasTouch}
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
              initialX={Math.max(0, Math.round((canvasDisplayWidth - 240) / 2))}
              initialY={Math.round(44 * canvasScaleY)}
              selected={activeLayer === 'meta'}
              outlineRadius={0}
              canvasWidth={canvasDisplayWidth}
              canvasHeight={canvasDisplayHeight}
              onDragGuideChange={onDragGuideChange}
              onRotationGuideChange={onRotationGuideChange}
              onSelect={() => setSelectedLayer('meta')}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'meta' : null)
              }
              style={[
                styles.metaBlock,
                { zIndex: baseLayerZ('meta'), elevation: baseLayerZ('meta') },
              ]}
            >
              <Text style={styles.metaTitle}>{activityName}</Text>
              <Text style={styles.metaSubtitle}>{dateText}</Text>
            </DraggableBlock>
          ) : null}

          {visibleLayers.stats ? (
            <DraggableBlock
              key="stats-layer"
              initialX={centeredStatsXDisplay}
              initialY={Math.round(template.y * canvasScaleY)}
              selected={activeLayer === 'stats'}
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
              />
            </DraggableBlock>
          ) : null}

          {routeMode !== 'off' && visibleLayers.route ? (
            <DraggableBlock
              key="route-layer"
              initialX={routeInitialXDisplay}
              initialY={routeInitialYDisplay}
              selected={activeLayer === 'route'}
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
              style={[
                styles.routeBlock,
                { zIndex: baseLayerZ('route'), elevation: baseLayerZ('route') },
              ]}
            >
              <RouteLayer
                polyline={activityPolyline}
                mode={routeMode === 'map' ? 'map' : 'trace'}
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
                initialX={Math.round((20 + index * 12) * canvasScaleX)}
                initialY={Math.round((80 + index * 12) * canvasScaleY)}
                selected={activeLayer === layerId}
                outlineRadius={radius.lg}
                canvasWidth={canvasDisplayWidth}
                canvasHeight={canvasDisplayHeight}
                onDragGuideChange={onDragGuideChange}
                onRotationGuideChange={onRotationGuideChange}
                rotationDeg={overlay.rotationDeg}
                onSelect={() => setSelectedLayer(layerId)}
                onInteractionChange={(active) =>
                  setActiveLayer(active ? layerId : null)
                }
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
