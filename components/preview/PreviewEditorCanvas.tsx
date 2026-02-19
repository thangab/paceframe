import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlphaType,
  Canvas,
  ColorType,
  Fill,
  Group,
  ImageShader,
  Rect,
  RuntimeShader,
  Skia,
  Text as SkiaText,
  matchFont,
  useImage,
} from '@shopify/react-native-skia';
import { DirectionalBackgroundBlur } from '@/components/preview/DirectionalBackgroundBlur';
import { DraggableBlock } from '@/components/DraggableBlock';
import { RouteLayer } from '@/components/RouteLayer';
import {
  PrimaryStatLayerContent,
  StatsLayerContent,
} from '@/components/StatsLayerContent';
import { radius, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CHECKER_SIZE } from '@/lib/previewConfig';
import type {
  BackgroundGradient,
  FieldId,
  FontPreset,
  ImageOverlay,
  LayerId,
  PreviewTemplateDefinition,
  PreviewTemplateRenderableTextElement,
  RouteMapVariant,
  RouteMode,
  StatsLayout,
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
type LayerStyleSettings = {
  meta: { color: string; opacity: number };
  stats: { color: string; opacity: number };
  route: { color: string; opacity: number };
  primary: { color: string; opacity: number };
};
type VisualEffectPreset = {
  id: string;
  label: string;
  description?: string;
  backgroundBlurRadius?: number;
  backgroundRadialFocus?: boolean;
  backgroundFilter?: Record<string, number | string>[];
  subjectFilter?: Record<string, number | string>[];
  backgroundOverlayColor: string;
  backgroundOverlayOpacity: number;
  subjectOverlayColor: string;
  subjectOverlayOpacity: number;
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
  template: StatsLayout;
  fontPreset: FontPreset;
  effectiveVisible: Record<FieldId, boolean>;
  supportsPrimaryLayer: boolean;
  primaryVisible: boolean;
  primaryField: FieldId;
  primaryValueText: string;
  distanceText: string;
  durationText: string;
  paceText: string;
  elevText: string;
  cadenceText: string;
  caloriesText: string;
  avgHeartRateText: string;
  layerStyleSettings: LayerStyleSettings;
  sunsetPrimaryGradient: [string, string, string];
  selectedFilterEffect: VisualEffectPreset;
  selectedBlurEffect: VisualEffectPreset;
  selectedFilterEffectId: string;
  selectedBlurEffectId: string;
  centeredStatsXDisplay: number;
  dynamicStatsWidthDisplay: number;
  canvasScaleX: number;
  canvasScaleY: number;
  cycleStatsLayout: () => void;
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
  quickTemplateMode?: boolean;
  templateFixedTextElements?: PreviewTemplateRenderableTextElement[];
  templateBackgroundMediaFrame?: PreviewTemplateDefinition['backgroundMediaFrame'] | null;
  onDragGuideChange: (guides: GuideState) => void;
  onRotationGuideChange: (active: boolean) => void;
};

const RADIAL_BLUR_EFFECT = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 resolution;
uniform float2 center;
uniform float intensity;
uniform float radius;

half4 main(float2 xy) {
  float2 clampedXY = clamp(xy, float2(0.0), resolution);
  float2 dir = clampedXY - center;
  float dist = length(dir);
  float2 nDir = dist > 0.0001 ? dir / dist : float2(0.0);

  float falloff = smoothstep(0.0, radius, dist);
  float blurAmount = falloff * intensity;

  half4 color = half4(0.0);
  float total = 0.0;

  for (int i = 0; i < 10; i++) {
    float t = float(i) / 9.0;
    float2 samplePos = clampedXY - nDir * blurAmount * t;
    samplePos = clamp(samplePos, float2(0.0), resolution);
    color += image.eval(samplePos);
    total += 1.0;
  }

  return color / total;
}
`);

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
  supportsPrimaryLayer,
  primaryVisible,
  primaryField,
  primaryValueText,
  distanceText,
  durationText,
  paceText,
  elevText,
  cadenceText,
  caloriesText,
  avgHeartRateText,
  layerStyleSettings,
  sunsetPrimaryGradient,
  selectedFilterEffect,
  selectedBlurEffect,
  selectedFilterEffectId,
  selectedBlurEffectId,
  centeredStatsXDisplay,
  dynamicStatsWidthDisplay,
  canvasScaleX,
  canvasScaleY,
  cycleStatsLayout,
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
  quickTemplateMode = false,
  templateFixedTextElements = [],
  templateBackgroundMediaFrame = null,
  onDragGuideChange,
  onRotationGuideChange,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resizeWidth = useRef(new Animated.Value(canvasDisplayWidth)).current;
  const resizeHeight = useRef(new Animated.Value(canvasDisplayHeight)).current;
  const prevIsSquareRef = useRef(isSquareFormat);
  const [lockCenteredStage, setLockCenteredStage] = useState(false);
  const [subjectRadialCenter, setSubjectRadialCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const showSelectionOutline = !isCapturingOverlay && !isExportingPng;
  const interactionLocked = quickTemplateMode;
  const resolvedTemplateBackgroundFrame = useMemo(() => {
    if (!quickTemplateMode || !templateBackgroundMediaFrame) return null;
    const width = Math.max(1, templateBackgroundMediaFrame.width);
    const height = Math.max(1, templateBackgroundMediaFrame.height);
    return {
      width,
      height,
      left:
        templateBackgroundMediaFrame.x ??
        Math.round((canvasDisplayWidth - width) / 2),
      top:
        templateBackgroundMediaFrame.y ??
        Math.round((canvasDisplayHeight - height) / 2),
      fit: templateBackgroundMediaFrame.fit ?? 'cover',
      mediaScale: Math.max(0.1, templateBackgroundMediaFrame.mediaScale ?? 1),
      mediaOffsetX: templateBackgroundMediaFrame.mediaOffsetX ?? 0,
      mediaOffsetY: templateBackgroundMediaFrame.mediaOffsetY ?? 0,
    };
  }, [
    canvasDisplayHeight,
    canvasDisplayWidth,
    quickTemplateMode,
    templateBackgroundMediaFrame,
  ]);
  const backgroundMediaStyle = resolvedTemplateBackgroundFrame
    ? {
        left: resolvedTemplateBackgroundFrame.left,
        top: resolvedTemplateBackgroundFrame.top,
        width: resolvedTemplateBackgroundFrame.width,
        height: resolvedTemplateBackgroundFrame.height,
      }
    : null;
  const backgroundMediaFit = resolvedTemplateBackgroundFrame?.fit ?? 'cover';
  const backgroundMediaResizeMode =
    backgroundMediaFit === 'contain' ? 'contain' : 'cover';
  const backgroundRenderWidth =
    resolvedTemplateBackgroundFrame?.width ?? canvasDisplayWidth;
  const backgroundRenderHeight =
    resolvedTemplateBackgroundFrame?.height ?? canvasDisplayHeight;
  const framedBackgroundContentStyle = useMemo(() => {
    if (!resolvedTemplateBackgroundFrame) return null;
    const mediaWidth = media?.width ?? 0;
    const mediaHeight = media?.height ?? 0;
    if (mediaWidth <= 0 || mediaHeight <= 0) {
      return {
        left: 0,
        top: 0,
        width: resolvedTemplateBackgroundFrame.width,
        height: resolvedTemplateBackgroundFrame.height,
      };
    }

    const frameRatio =
      resolvedTemplateBackgroundFrame.width /
      resolvedTemplateBackgroundFrame.height;
    const mediaRatio = mediaWidth / mediaHeight;

    if (backgroundMediaFit === 'width-crop-center') {
      const scaledWidth =
        resolvedTemplateBackgroundFrame.width *
        resolvedTemplateBackgroundFrame.mediaScale;
      const scaledHeight = scaledWidth / mediaRatio;
      return {
        left:
          (resolvedTemplateBackgroundFrame.width - scaledWidth) / 2 +
          resolvedTemplateBackgroundFrame.mediaOffsetX,
        top:
          (resolvedTemplateBackgroundFrame.height - scaledHeight) / 2 +
          resolvedTemplateBackgroundFrame.mediaOffsetY,
        width: scaledWidth,
        height: scaledHeight,
      };
    }

    if (backgroundMediaResizeMode === 'contain') {
      if (mediaRatio > frameRatio) {
        const fittedHeight =
          (resolvedTemplateBackgroundFrame.width / mediaRatio) *
          resolvedTemplateBackgroundFrame.mediaScale;
        const fittedWidth =
          resolvedTemplateBackgroundFrame.width *
          resolvedTemplateBackgroundFrame.mediaScale;
        return {
          left:
            (resolvedTemplateBackgroundFrame.width - fittedWidth) / 2 +
            resolvedTemplateBackgroundFrame.mediaOffsetX,
          top:
            (resolvedTemplateBackgroundFrame.height - fittedHeight) / 2 +
            resolvedTemplateBackgroundFrame.mediaOffsetY,
          width: fittedWidth,
          height: fittedHeight,
        };
      }
      const fittedWidth =
        resolvedTemplateBackgroundFrame.height *
        mediaRatio *
        resolvedTemplateBackgroundFrame.mediaScale;
      const fittedHeight =
        resolvedTemplateBackgroundFrame.height *
        resolvedTemplateBackgroundFrame.mediaScale;
      return {
        left:
          (resolvedTemplateBackgroundFrame.width - fittedWidth) / 2 +
          resolvedTemplateBackgroundFrame.mediaOffsetX,
        top:
          (resolvedTemplateBackgroundFrame.height - fittedHeight) / 2 +
          resolvedTemplateBackgroundFrame.mediaOffsetY,
        width: fittedWidth,
        height: fittedHeight,
      };
    }

    if (mediaRatio > frameRatio) {
      const scaledHeight =
        resolvedTemplateBackgroundFrame.height *
        resolvedTemplateBackgroundFrame.mediaScale;
      const scaledWidth = scaledHeight * mediaRatio;
      return {
        left:
          (resolvedTemplateBackgroundFrame.width - scaledWidth) / 2 +
          resolvedTemplateBackgroundFrame.mediaOffsetX,
        top: 0 + resolvedTemplateBackgroundFrame.mediaOffsetY,
        width: scaledWidth,
        height: scaledHeight,
      };
    }

    const scaledWidth =
      resolvedTemplateBackgroundFrame.width *
      resolvedTemplateBackgroundFrame.mediaScale;
    const scaledHeight = scaledWidth / mediaRatio;
    return {
      left: 0 + resolvedTemplateBackgroundFrame.mediaOffsetX,
      top:
        (resolvedTemplateBackgroundFrame.height - scaledHeight) / 2 +
        resolvedTemplateBackgroundFrame.mediaOffsetY,
      width: scaledWidth,
      height: scaledHeight,
    };
  }, [
    backgroundMediaFit,
    backgroundMediaResizeMode,
    media?.height,
    media?.width,
    resolvedTemplateBackgroundFrame,
  ]);
  const mergedBackgroundFilter = [
    ...(selectedFilterEffect.backgroundFilter ?? []),
    ...(selectedBlurEffect.backgroundFilter ?? []),
  ];
  const mergedSubjectFilter = [
    ...(selectedFilterEffect.subjectFilter ?? []),
    ...(selectedBlurEffect.subjectFilter ?? []),
  ];
  const useTrueBlackAndWhite =
    selectedFilterEffectId === 'black-and-white' ||
    selectedFilterEffectId === 'bw-soft';
  const useRadialBlurShader =
    selectedBlurEffectId === 'background-radial-blur' &&
    media?.type === 'image' &&
    Boolean(media?.uri);
  const useMotionBlurShader =
    selectedBlurEffectId === 'background-motion-blur' &&
    media?.type === 'image' &&
    Boolean(media?.uri);
  const useBackgroundSkiaShader = useRadialBlurShader || useMotionBlurShader;
  const skiaBackgroundImage = useImage(
    useBackgroundSkiaShader ? (media?.uri ?? null) : null,
  );
  const skiaSubjectImage = useImage(
    useRadialBlurShader && autoSubjectUri ? autoSubjectUri : null,
  );
  const fallbackRadialCenter = useMemo(
    () => ({
      x: canvasDisplayWidth * 0.5,
      y: canvasDisplayHeight * 0.56,
    }),
    [canvasDisplayWidth, canvasDisplayHeight],
  );
  const resolvedRadialCenter = subjectRadialCenter ?? fallbackRadialCenter;

  useEffect(() => {
    if (!useRadialBlurShader || !skiaSubjectImage) {
      setSubjectRadialCenter(null);
      return;
    }

    const rasterImage = skiaSubjectImage.makeNonTextureImage();
    const imageWidth = rasterImage.width();
    const imageHeight = rasterImage.height();
    if (imageWidth <= 0 || imageHeight <= 0) {
      setSubjectRadialCenter(null);
      return;
    }

    const pixels = rasterImage.readPixels(0, 0, {
      width: imageWidth,
      height: imageHeight,
      alphaType: AlphaType.Unpremul,
      colorType: ColorType.RGBA_8888,
    });
    if (!pixels || pixels.length < imageWidth * imageHeight * 4) {
      setSubjectRadialCenter(null);
      return;
    }

    // Scan alpha channel to locate the subject center from transparency mask.
    const stride = Math.max(
      1,
      Math.floor(Math.max(imageWidth, imageHeight) / 720),
    );
    let sumX = 0;
    let sumY = 0;
    let sumA = 0;
    let minY = imageHeight;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < imageHeight; y += stride) {
      for (let x = 0; x < imageWidth; x += stride) {
        const alpha = pixels[(y * imageWidth + x) * 4 + 3];
        if (alpha <= 10) continue;
        sumX += x * alpha;
        sumY += y * alpha;
        sumA += alpha;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (sumA <= 0 || maxX < 0 || maxY < 0) {
      setSubjectRadialCenter(null);
      return;
    }

    const centerXImage = sumX / sumA;
    const centroidYImage = sumY / sumA;
    const subjectHeight = Math.max(1, maxY - minY);
    // Slightly lift the focus so the blur center sits closer to bust/head.
    const centerYImage = Math.max(
      minY,
      Math.min(maxY, centroidYImage - subjectHeight * 0.14),
    );
    const scale = Math.max(
      canvasDisplayWidth / imageWidth,
      canvasDisplayHeight / imageHeight,
    );
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;
    const offsetX = (canvasDisplayWidth - scaledWidth) / 2;
    const offsetY = (canvasDisplayHeight - scaledHeight) / 2;
    const nextCenter = {
      x: Math.max(
        0,
        Math.min(canvasDisplayWidth, offsetX + centerXImage * scale),
      ),
      y: Math.max(
        0,
        Math.min(canvasDisplayHeight, offsetY + centerYImage * scale),
      ),
    };

    setSubjectRadialCenter((prev) => {
      if (
        prev &&
        Math.abs(prev.x - nextCenter.x) < 0.5 &&
        Math.abs(prev.y - nextCenter.y) < 0.5
      ) {
        return prev;
      }
      return nextCenter;
    });
  }, [
    autoSubjectUri,
    canvasDisplayHeight,
    canvasDisplayWidth,
    skiaSubjectImage,
    useRadialBlurShader,
  ]);
  const usesSunsetHeader =
    template.layout === 'sunset-hero' || template.layout === 'morning-glass';
  const usesLayoutHeader = usesSunsetHeader || template.layout === 'split-bold';
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
  const defaultMetaWidth = usesLayoutHeader ? 280 : 240;
  const splitBoldStatsCount = (() => {
    if (template.layout !== 'split-bold') return 0;
    return (
      (effectiveVisible.distance ? 1 : 0) +
      (effectiveVisible.time ? 1 : 0) +
      (effectiveVisible.pace ? 1 : 0) +
      (effectiveVisible.elev ? 1 : 0) +
      (effectiveVisible.cadence ? 1 : 0) +
      (effectiveVisible.calories ? 1 : 0) +
      (effectiveVisible.avgHr ? 1 : 0)
    );
  })();
  const defaultStatsY = (() => {
    switch (template.layout) {
      case 'sunset-hero':
        return Math.round(430 * canvasScaleY);
      case 'morning-glass':
        return Math.round(452 * canvasScaleY);
      case 'split-bold': {
        const estimatedStatsHeight = Math.max(
          120,
          Math.round(splitBoldStatsCount * 96 * canvasScaleY),
        );
        return Math.max(
          0,
          Math.round((canvasDisplayHeight - estimatedStatsHeight) / 2),
        );
      }
      default:
        return Math.round(template.y * canvasScaleY);
    }
  })();
  const defaultStatsX = (() => {
    switch (template.layout) {
      case 'split-bold':
        return Math.max(
          0,
          Math.round(canvasDisplayWidth - dynamicStatsWidthDisplay),
        );
      default:
        return centeredStatsXDisplay;
    }
  })();
  const defaultPrimaryX = (() => {
    switch (template.layout) {
      case 'sunset-hero': {
        const primaryWidth = Math.round(344 * canvasScaleX);
        return Math.max(0, Math.round((canvasDisplayWidth - primaryWidth) / 2));
      }
      case 'morning-glass':
        return Math.round(50 * canvasScaleX);
      case 'split-bold':
        return 0;
      default:
        return Math.round(40 * canvasScaleX);
    }
  })();
  const defaultPrimaryY = (() => {
    switch (template.layout) {
      case 'sunset-hero':
        return Math.round(108 * canvasScaleY);
      case 'morning-glass':
        return Math.round(252 * canvasScaleY);
      case 'split-bold': {
        const normalized = primaryValueText.trim();
        const unitMatch = normalized.match(/(\/km|\/mi|km|mi|m|bpm|spm|rpm)$/i);
        const unit = unitMatch ? unitMatch[1] : '';
        const main = unit
          ? normalized.slice(0, normalized.length - unit.length).trim()
          : normalized;
        const mainLines = main.includes('.') ? main.split('.').length : 1;
        // Mirrors SplitBoldPrimaryValue visual stack:
        // lineHeight(128) per main line + unit block (~92 effective with negative margin).
        const estimatedPrimaryHeight = mainLines * 128 + (unit ? 92 : 0);
        return Math.max(
          0,
          Math.round((canvasDisplayHeight - estimatedPrimaryHeight) / 2),
        );
      }
      default:
        return Math.round(260 * canvasScaleY);
    }
  })();
  const defaultRouteY = (() => {
    if (template.layout === 'sunset-hero') {
      return Math.max(
        0,
        Math.round((canvasDisplayHeight - routeLayerHeightDisplay) / 2),
      );
    }
    return routeInitialYDisplay;
  })();
  const defaultRouteX = (() => {
    if (template.layout === 'sunset-hero') {
      return Math.max(
        0,
        Math.round((canvasDisplayWidth - routeLayerWidthDisplay) / 2),
      );
    }
    return routeInitialXDisplay;
  })();
  const canRenderRouteLayer =
    routeMode !== 'off' &&
    Boolean(visibleLayers.route) &&
    typeof activityPolyline === 'string' &&
    activityPolyline.trim().length > 0;

  useEffect(() => {
    const isSquareToPortrait = prevIsSquareRef.current && !isSquareFormat;
    if (isSquareToPortrait) {
      setLockCenteredStage(true);
    }

    Animated.parallel([
      Animated.timing(resizeWidth, {
        toValue: canvasDisplayWidth,
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(resizeHeight, {
        toValue: canvasDisplayHeight,
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished && isSquareToPortrait) {
        setLockCenteredStage(false);
      }
    });

    prevIsSquareRef.current = isSquareFormat;
  }, [
    canvasDisplayHeight,
    canvasDisplayWidth,
    isSquareFormat,
    resizeHeight,
    resizeWidth,
  ]);

  return (
    <View
      style={[
        styles.stageWrap,
        isSquareFormat || lockCenteredStage
          ? styles.stageWrapCentered
          : styles.stageWrapTop,
      ]}
    >
      <Animated.View
        style={[
          styles.canvasScaleWrap,
          { width: resizeWidth, height: resizeHeight },
        ]}
      >
        <View
          collapsable={false}
          ref={exportRef}
          style={[
            styles.storyCanvas,
            { borderColor: colors.border },
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
            resolvedTemplateBackgroundFrame ? (
              <View
                style={[
                  styles.mediaFrameClip,
                  backgroundMediaStyle,
                  (isCapturingOverlay ||
                    (isExportingPng && pngTransparentOnly)) &&
                    styles.hiddenForCapture,
                ]}
              >
                <Video
                  source={{ uri: media.uri }}
                  style={[
                    styles.mediaFrameContent,
                    framedBackgroundContentStyle,
                    mergedBackgroundFilter.length > 0
                      ? ({ filter: mergedBackgroundFilter } as any)
                      : null,
                  ]}
                  shouldPlay
                  isLooping
                  isMuted={false}
                  resizeMode={ResizeMode.COVER}
                />
              </View>
            ) : (
              <Video
                source={{ uri: media.uri }}
                style={[
                  styles.media,
                  mergedBackgroundFilter.length > 0
                    ? ({ filter: mergedBackgroundFilter } as any)
                    : null,
                  (isCapturingOverlay ||
                    (isExportingPng && pngTransparentOnly)) &&
                    styles.hiddenForCapture,
                ]}
                shouldPlay
                isLooping
                isMuted={false}
                resizeMode={ResizeMode.COVER}
              />
            )
          ) : media?.uri ? (
            useRadialBlurShader && skiaBackgroundImage && RADIAL_BLUR_EFFECT ? (
              <Canvas
                style={[
                  styles.media,
                  backgroundMediaStyle,
                  isExportingPng &&
                    pngTransparentOnly &&
                    styles.hiddenForCapture,
                ]}
              >
                <Fill>
                  <RuntimeShader
                    source={RADIAL_BLUR_EFFECT}
                    uniforms={{
                      resolution: [backgroundRenderWidth, backgroundRenderHeight],
                      center: [
                        resolvedTemplateBackgroundFrame
                          ? backgroundRenderWidth * 0.5
                          : resolvedRadialCenter.x,
                        resolvedTemplateBackgroundFrame
                          ? backgroundRenderHeight * 0.5
                          : resolvedRadialCenter.y,
                      ],
                      intensity:
                        Math.min(backgroundRenderWidth, backgroundRenderHeight) *
                        0.26,
                      radius:
                        Math.min(backgroundRenderWidth, backgroundRenderHeight) *
                        0.58,
                    }}
                  >
                    <ImageShader
                      image={skiaBackgroundImage}
                      x={0}
                      y={0}
                      width={backgroundRenderWidth}
                      height={backgroundRenderHeight}
                      fit="cover"
                    />
                  </RuntimeShader>
                </Fill>
              </Canvas>
            ) : useMotionBlurShader && skiaBackgroundImage ? (
              <DirectionalBackgroundBlur
                image={skiaBackgroundImage}
                width={backgroundRenderWidth}
                height={backgroundRenderHeight}
                direction={{ x: 1, y: 0 }}
                intensity={
                  Math.min(backgroundRenderWidth, backgroundRenderHeight) * 0.11
                }
                samples={12}
                style={[
                  styles.media,
                  backgroundMediaStyle,
                  isExportingPng &&
                    pngTransparentOnly &&
                    styles.hiddenForCapture,
                ]}
              />
            ) : (
              resolvedTemplateBackgroundFrame ? (
                <View
                  style={[
                    styles.mediaFrameClip,
                    backgroundMediaStyle,
                    isExportingPng &&
                      pngTransparentOnly &&
                      styles.hiddenForCapture,
                  ]}
                >
                  <Image
                    source={{ uri: media.uri }}
                    blurRadius={selectedBlurEffect.backgroundBlurRadius ?? 0}
                    style={[
                      styles.mediaFrameContent,
                      framedBackgroundContentStyle,
                      mergedBackgroundFilter.length > 0
                        ? ({ filter: mergedBackgroundFilter } as any)
                        : null,
                    ]}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: media.uri }}
                  blurRadius={selectedBlurEffect.backgroundBlurRadius ?? 0}
                  style={[
                    styles.media,
                    backgroundMediaStyle,
                    mergedBackgroundFilter.length > 0
                      ? ({ filter: mergedBackgroundFilter } as any)
                      : null,
                    isExportingPng &&
                      pngTransparentOnly &&
                      styles.hiddenForCapture,
                  ]}
                  resizeMode={backgroundMediaResizeMode}
                />
              )
            )
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
          {selectedFilterEffect.backgroundOverlayOpacity > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.backgroundFilterLayer,
                {
                  backgroundColor: selectedFilterEffect.backgroundOverlayColor,
                  opacity: selectedFilterEffect.backgroundOverlayOpacity,
                },
                isExportingPng && pngTransparentOnly && styles.hiddenForCapture,
              ]}
            />
          ) : null}
          {selectedBlurEffect.backgroundOverlayOpacity > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.backgroundFilterLayer,
                {
                  backgroundColor: selectedBlurEffect.backgroundOverlayColor,
                  opacity: selectedBlurEffect.backgroundOverlayOpacity,
                },
                isExportingPng && pngTransparentOnly && styles.hiddenForCapture,
              ]}
            />
          ) : null}

          {autoSubjectUri ? (
            <View pointerEvents="none" style={styles.autoSubjectLayer}>
              <Image
                source={{ uri: autoSubjectUri }}
                style={[
                  styles.media,
                  mergedSubjectFilter.length > 0
                    ? ({ filter: mergedSubjectFilter } as any)
                    : null,
                ]}
                resizeMode="cover"
              />
              {selectedFilterEffect.subjectOverlayOpacity > 0 ? (
                <View
                  style={[
                    styles.subjectFilterOverlay,
                    {
                      backgroundColor: selectedFilterEffect.subjectOverlayColor,
                      opacity: selectedFilterEffect.subjectOverlayOpacity,
                    },
                  ]}
                />
              ) : null}
              {selectedBlurEffect.subjectOverlayOpacity > 0 ? (
                <View
                  style={[
                    styles.subjectFilterOverlay,
                    {
                      backgroundColor: selectedBlurEffect.subjectOverlayColor,
                      opacity: selectedBlurEffect.subjectOverlayOpacity,
                    },
                  ]}
                />
              ) : null}
            </View>
          ) : null}
          {useTrueBlackAndWhite ? (
            <View
              pointerEvents="none"
              style={[
                styles.trueBlackWhiteBlendLayer,
                isExportingPng && pngTransparentOnly && styles.hiddenForCapture,
              ]}
            />
          ) : null}
          <View
            style={[
              styles.canvasTapCatcher,
              quickTemplateMode ? styles.canvasTapCatcherTemplate : null,
            ]}
            onTouchEnd={onCanvasTouch}
          />

          {visibleLayers.meta && hasHeaderContent ? (
            <DraggableBlock
              key="meta-layer"
              initialX={
                layerTransforms.meta?.x ??
                Math.max(
                  0,
                  Math.round((canvasDisplayWidth - defaultMetaWidth) / 2),
                )
              }
              initialY={
                layerTransforms.meta?.y ?? Math.round(44 * canvasScaleY)
              }
              initialScale={layerTransforms.meta?.scale ?? 1}
              rotationDeg={layerTransforms.meta?.rotationDeg ?? 0}
              selected={
                showSelectionOutline &&
                !interactionLocked &&
                selectedLayer === 'meta'
              }
              locked={interactionLocked}
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
                usesLayoutHeader ? styles.metaBlockSunset : null,
                { opacity: layerStyleSettings.meta.opacity },
                { zIndex: baseLayerZ('meta'), elevation: baseLayerZ('meta') },
              ]}
            >
              {headerVisible.title ? (
                <Text
                  style={[
                    styles.metaTitle,
                    usesLayoutHeader ? styles.metaTitleSunset : null,
                    { color: layerStyleSettings.meta.color },
                    {
                      fontFamily: fontPreset.family,
                      fontWeight: fontPreset.weightTitle,
                    },
                  ]}
                >
                  {usesLayoutHeader ? activityName.toUpperCase() : activityName}
                </Text>
              ) : null}
              {usesLayoutHeader && headerVisible.title ? (
                <View
                  style={[
                    styles.metaDividerSunset,
                    { backgroundColor: `${layerStyleSettings.meta.color}66` },
                  ]}
                />
              ) : null}
              {!usesLayoutHeader && headerMetaLine ? (
                <Text
                  style={[
                    styles.metaSubtitle,
                    { color: layerStyleSettings.meta.color },
                    {
                      fontFamily: fontPreset.family,
                      fontWeight: '400',
                    },
                  ]}
                >
                  {headerMetaLine}
                </Text>
              ) : null}
              {usesLayoutHeader && headerMetaLine ? (
                <Text
                  style={[
                    styles.metaSubtitle,
                    styles.metaSubtitleSunset,
                    { color: layerStyleSettings.meta.color },
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
              initialX={layerTransforms.stats?.x ?? defaultStatsX}
              initialY={layerTransforms.stats?.y ?? defaultStatsY}
              initialScale={layerTransforms.stats?.scale ?? 1}
              rotationDeg={layerTransforms.stats?.rotationDeg ?? 0}
              selected={
                showSelectionOutline &&
                !interactionLocked &&
                selectedLayer === 'stats'
              }
              locked={interactionLocked}
              outlineRadius={template.radius}
              canvasWidth={canvasDisplayWidth}
              canvasHeight={canvasDisplayHeight}
              onDragGuideChange={onDragGuideChange}
              onRotationGuideChange={onRotationGuideChange}
              onSelect={() => setSelectedLayer('stats')}
              onTap={interactionLocked ? undefined : cycleStatsLayout}
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
                  opacity: layerStyleSettings.stats.opacity,
                  zIndex: baseLayerZ('stats'),
                  elevation: baseLayerZ('stats'),
                },
              ]}
            >
              <StatsLayerContent
                template={template}
                fontPreset={fontPreset}
                visible={effectiveVisible}
                layerTextColor={layerStyleSettings.stats.color}
                sunsetPrimaryGradient={sunsetPrimaryGradient}
                primaryInSeparateLayer={supportsPrimaryLayer && primaryVisible}
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

          {supportsPrimaryLayer && primaryVisible ? (
            <DraggableBlock
              key="primary-layer"
              initialX={layerTransforms.primary?.x ?? defaultPrimaryX}
              initialY={layerTransforms.primary?.y ?? defaultPrimaryY}
              initialScale={layerTransforms.primary?.scale ?? 1}
              rotationDeg={layerTransforms.primary?.rotationDeg ?? 0}
              selected={
                showSelectionOutline &&
                !interactionLocked &&
                selectedLayer === 'primary'
              }
              locked={interactionLocked}
              outlineRadius={0}
              canvasWidth={canvasDisplayWidth}
              canvasHeight={canvasDisplayHeight}
              onDragGuideChange={onDragGuideChange}
              onRotationGuideChange={onRotationGuideChange}
              onSelect={() => setSelectedLayer('primary')}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'primary' : null)
              }
              onTransformEnd={(next) => onLayerTransformChange('primary', next)}
              style={[
                styles.primaryBlock,
                {
                  width: Math.round(
                    (template.layout === 'split-bold'
                      ? 176
                      : template.layout === 'sunset-hero'
                        ? 344
                        : 250) * canvasScaleX,
                  ),
                  opacity: layerStyleSettings.primary.opacity,
                  zIndex: baseLayerZ('primary'),
                  elevation: baseLayerZ('primary'),
                },
              ]}
            >
              <PrimaryStatLayerContent
                template={template}
                fontPreset={fontPreset}
                primaryField={primaryField}
                value={primaryValueText}
                layerTextColor={layerStyleSettings.primary.color}
                sunsetPrimaryGradient={sunsetPrimaryGradient}
              />
            </DraggableBlock>
          ) : null}

          {canRenderRouteLayer ? (
            <DraggableBlock
              key="route-layer"
              initialX={layerTransforms.route?.x ?? defaultRouteX}
              initialY={layerTransforms.route?.y ?? defaultRouteY}
              initialScale={layerTransforms.route?.scale ?? 1}
              rotationDeg={layerTransforms.route?.rotationDeg ?? 0}
              selected={
                showSelectionOutline &&
                !interactionLocked &&
                selectedLayer === 'route'
              }
              locked={interactionLocked}
              outlineRadius={0}
              canvasWidth={canvasDisplayWidth}
              canvasHeight={canvasDisplayHeight}
              onDragGuideChange={onDragGuideChange}
              onRotationGuideChange={onRotationGuideChange}
              onSelect={() => setSelectedLayer('route')}
              onTap={interactionLocked ? undefined : cycleRouteMode}
              onInteractionChange={(active) =>
                setActiveLayer(active ? 'route' : null)
              }
              onTransformEnd={(next) => onLayerTransformChange('route', next)}
              style={[
                styles.routeBlock,
                { opacity: layerStyleSettings.route.opacity },
                { zIndex: baseLayerZ('route'), elevation: baseLayerZ('route') },
              ]}
            >
              <RouteLayer
                polyline={activityPolyline}
                mode={routeMode === 'map' ? 'map' : 'trace'}
                mapVariant={routeMapVariant}
                width={routeLayerWidthDisplay}
                height={routeLayerHeightDisplay}
                traceColor={layerStyleSettings.route.color}
              />
            </DraggableBlock>
          ) : null}

          {imageOverlays.map((overlay, index) => {
            const layerId: LayerId = `image:${overlay.id}`;
            if (!visibleLayers[layerId]) return null;
            const overlaySource =
              typeof overlay.asset === 'number'
                ? overlay.asset
                : overlay.uri
                  ? { uri: overlay.uri }
                  : null;
            if (!overlaySource) return null;

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
                selected={
                  showSelectionOutline &&
                  !interactionLocked &&
                  selectedLayer === layerId
                }
                locked={interactionLocked}
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
                  source={overlaySource}
                  style={styles.imageOverlayImage}
                  resizeMode="contain"
                />
              </DraggableBlock>
            );
          })}

          {quickTemplateMode
            ? templateFixedTextElements.map((item) => (
                (() => {
                  const resolvedTextColor =
                    normalizeTemplateColor(item.color) ?? '#FFFFFF';
                  const resolvedBackgroundColor = normalizeTemplateColor(
                    item.backgroundColor,
                  );
                  const hasTransparentAccentToken = item.tokens.some(
                    (token) =>
                      token.accent &&
                      normalizeTemplateColor(token.color) === 'rgba(0,0,0,0)',
                  );
                  const resolvedBorderColor = normalizeTemplateColor(
                    item.borderColor,
                  );
                  const borderWidth =
                    item.borderWidth !== undefined
                      ? Math.max(0, item.borderWidth)
                      : 0;
                  const borderRadius =
                    item.borderRadius !== undefined
                      ? Math.max(
                          0,
                          Math.round(
                            item.borderRadius *
                              Math.min(canvasScaleX, canvasScaleY),
                          ),
                        )
                      : 0;
                  const usesCutout =
                    (resolvedTextColor === 'rgba(0,0,0,0)' ||
                      hasTransparentAccentToken) &&
                    Boolean(resolvedBackgroundColor);
                  const plainText = item.tokens.map((token) => token.text).join('');
                  const fontSize =
                    item.fontSize !== undefined
                      ? Math.round(item.fontSize * canvasScaleX)
                      : 14;
                  const lineHeight =
                    item.lineHeight !== undefined
                      ? Math.round(item.lineHeight * canvasScaleY)
                      : Math.round(fontSize * 1.2);
                  const paddingX =
                    item.paddingX !== undefined
                      ? Math.max(0, Math.round(item.paddingX * canvasScaleX))
                      : Math.max(5, Math.round(fontSize * 0.22));
                  const paddingY =
                    item.paddingY !== undefined
                      ? Math.max(0, Math.round(item.paddingY * canvasScaleY))
                      : Math.max(3, Math.round(fontSize * 0.16));
                  const letterSpacing = item.letterSpacing ?? 0.2;
                  const fontWeightNumeric = Number(item.fontWeight ?? '700');
                  const widthFactor =
                    Number.isFinite(fontWeightNumeric) && fontWeightNumeric >= 700
                      ? 0.58
                      : 0.55;
                  const leftPos = Math.round(item.x * canvasScaleX);
                  const maxWidthFromCanvas = Math.max(1, canvasDisplayWidth - leftPos);
                  const targetBlockWidth =
                    item.width !== undefined
                      ? Math.round(item.width * canvasScaleX)
                      : undefined;
                  const availableTextWidth = Math.max(
                    1,
                    (targetBlockWidth ?? maxWidthFromCanvas) - paddingX * 2,
                  );
                  const textLines = wrapTemplateTextLines({
                    text: plainText,
                    maxTextWidth: availableTextWidth,
                    fontSize,
                    letterSpacing,
                    widthFactor,
                  });
                  const estimatedTextWidth = Math.max(
                    ...textLines.map((line) =>
                      measureTemplateTextLineWidth({
                        line,
                        fontSize,
                        letterSpacing,
                        widthFactor,
                      }),
                    ),
                  );
                  const contentWidth = Math.max(1, Math.round(estimatedTextWidth));
                  const blockWidth = targetBlockWidth
                    ? Math.min(maxWidthFromCanvas, targetBlockWidth)
                    : Math.min(maxWidthFromCanvas, contentWidth + paddingX * 2);
                  const blockHeight = Math.max(
                    lineHeight * textLines.length + paddingY * 2,
                    fontSize + paddingY * 2,
                  );
                  const skiaFont = matchFont({
                    fontSize,
                    fontFamily:
                      typeof item.fontFamily === 'string' &&
                      item.fontFamily.trim().length > 0
                        ? item.fontFamily
                        : 'Arial',
                    fontWeight: item.fontWeight ?? '700',
                  });

                  return (
                    <View
                      key={item.id}
                      pointerEvents="none"
                      style={[
                        styles.templateTextLayer,
                        {
                          left: leftPos,
                          top: Math.round(item.y * canvasScaleY),
                          zIndex: item.isBehind ? 2 : 180,
                          elevation: item.isBehind ? 2 : 180,
                          width: usesCutout ? blockWidth : undefined,
                          height: usesCutout ? blockHeight : undefined,
                        },
                      ]}
                    >
                      {usesCutout ? (
                        <View
                          style={[
                            {
                              width: blockWidth,
                              height: blockHeight,
                              borderColor: resolvedBorderColor,
                              borderWidth,
                              borderRadius,
                              overflow: 'hidden',
                            },
                          ]}
                        >
                          <Canvas style={{ width: blockWidth, height: blockHeight }}>
                            <Rect
                              x={0}
                              y={0}
                              width={blockWidth}
                              height={blockHeight}
                              color={resolvedBackgroundColor as string}
                            />
                            <Group blendMode="dstOut">
                              {textLines.map((line, lineIndex) => {
                                const lineWidth = Math.round(
                                  Math.max(1, line.length) * fontSize * widthFactor +
                                    Math.max(0, line.length - 1) * letterSpacing,
                                );
                                const x =
                                  item.align === 'right'
                                    ? blockWidth - paddingX - lineWidth
                                    : item.align === 'center'
                                      ? Math.round((blockWidth - lineWidth) / 2)
                                      : paddingX;
                                const y =
                                  paddingY + fontSize + lineIndex * lineHeight;
                                return (
                                  <SkiaText
                                    key={`${item.id}-cutout-line-${lineIndex}`}
                                    x={x}
                                    y={y}
                                    text={line}
                                    font={skiaFont}
                                    color="#FFFFFF"
                                  />
                                );
                              })}
                            </Group>
                          </Canvas>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.templateTextValue,
                            {
                              color: resolvedTextColor,
                              backgroundColor: resolvedBackgroundColor,
                              borderColor: resolvedBorderColor,
                              borderWidth,
                              borderRadius,
                              paddingHorizontal: paddingX,
                              paddingVertical: paddingY,
                              opacity: item.opacity ?? 1,
                              textAlign: item.align ?? 'left',
                              fontSize,
                              fontFamily: item.fontFamily,
                              fontWeight: item.fontWeight ?? '700',
                              letterSpacing:
                                item.letterSpacing !== undefined
                                  ? item.letterSpacing
                                  : 0.2,
                              lineHeight,
                              width:
                                item.width !== undefined
                                  ? Math.min(
                                      maxWidthFromCanvas,
                                      Math.round(item.width * canvasScaleX),
                                    )
                                  : undefined,
                            },
                          ]}
                        >
                          {item.tokens.map((token, index) => (
                            <Text
                              key={`${item.id}-token-${index}`}
                              style={[
                                token.accent
                                  ? styles.templateTextValueAccent
                                  : undefined,
                                token.accent
                                  ? {
                                      fontFamily: token.fontFamily,
                                      fontSize: token.fontSize,
                                      fontWeight: token.fontWeight,
                                      letterSpacing: token.letterSpacing,
                                      color: normalizeTemplateColor(token.color),
                                    }
                                  : undefined,
                              ]}
                            >
                              {token.text}
                            </Text>
                          ))}
                        </Text>
                      )}
                    </View>
                  );
                })()
              ))
            : null}

          {!isPremium ? <Text style={styles.watermark}>PACEFRAME</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

function normalizeTemplateColor(value?: string) {
  if (!value) return undefined;
  if (value.trim().toLowerCase() === 'transparent') {
    return 'rgba(0,0,0,0)';
  }
  return value;
}

function measureTemplateTextLineWidth({
  line,
  fontSize,
  letterSpacing,
  widthFactor,
}: {
  line: string;
  fontSize: number;
  letterSpacing: number;
  widthFactor: number;
}) {
  const charCount = Math.max(1, line.length);
  return (
    charCount * fontSize * widthFactor +
    Math.max(0, charCount - 1) * letterSpacing
  );
}

function wrapTemplateTextLines({
  text,
  maxTextWidth,
  fontSize,
  letterSpacing,
  widthFactor,
}: {
  text: string;
  maxTextWidth: number;
  fontSize: number;
  letterSpacing: number;
  widthFactor: number;
}) {
  const sourceLines = text.split('\n');
  const wrapped: string[] = [];

  for (const sourceLine of sourceLines) {
    if (!sourceLine.trim()) {
      wrapped.push('');
      continue;
    }

    const words = sourceLine.split(/\s+/).filter(Boolean);
    let current = '';

    const flush = () => {
      if (current.length > 0) {
        wrapped.push(current);
        current = '';
      }
    };

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const candidateWidth = measureTemplateTextLineWidth({
        line: candidate,
        fontSize,
        letterSpacing,
        widthFactor,
      });

      if (candidateWidth <= maxTextWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        flush();
      }

      let remainder = word;
      while (remainder.length > 0) {
        let sliceLen = remainder.length;
        while (sliceLen > 1) {
          const slice = remainder.slice(0, sliceLen);
          const sliceWidth = measureTemplateTextLineWidth({
            line: slice,
            fontSize,
            letterSpacing,
            widthFactor,
          });
          if (sliceWidth <= maxTextWidth) break;
          sliceLen -= 1;
        }
        wrapped.push(remainder.slice(0, sliceLen));
        remainder = remainder.slice(sliceLen);
      }
    }

    flush();
  }

  return wrapped.length > 0 ? wrapped : [''];
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      paddingTop: 2,
      paddingBottom: 120,
    },
    canvasScaleWrap: {
      overflow: 'hidden',
      borderRadius: radius.lg,
    },
    storyCanvas: {
      width: '100%',
      height: '100%',
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.previewCanvasBase,
      borderWidth: 1,
      borderColor: 'transparent',
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
    mediaFrameClip: {
      position: 'absolute',
      overflow: 'hidden',
      zIndex: 0,
      elevation: 0,
    },
    mediaFrameContent: {
      position: 'absolute',
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
      backgroundColor: colors.previewCheckerDark,
    },
    checkerTileLight: {
      backgroundColor: colors.previewCheckerLight,
    },
    centerGuideVertical: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '50%',
      width: 1,
      marginLeft: -0.5,
      backgroundColor: colors.previewGuide,
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
      backgroundColor: colors.previewGuide,
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
      backgroundColor: colors.previewGuide,
      zIndex: 1000,
      elevation: 1000,
    },
    rotationGuideBadgeText: {
      color: colors.previewGuideText,
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
    backgroundFilterLayer: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      zIndex: 4,
      elevation: 4,
    },
    subjectFilterOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    trueBlackWhiteBlendLayer: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      zIndex: 6,
      elevation: 6,
      backgroundColor: colors.solidBlack,
      mixBlendMode: 'saturation',
    },
    canvasTapCatcher: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      zIndex: 1,
      elevation: 1,
    },
    canvasTapCatcherTemplate: {
      zIndex: 999,
      elevation: 999,
    },
    statsBlock: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'stretch',
    },
    primaryBlock: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      alignItems: 'stretch',
      backgroundColor: 'transparent',
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
      color: colors.onImageText,
      fontSize: 12,
      marginTop: 2,
      textShadowColor: colors.onImageShadow,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    metaSubtitleSunset: {
      color: colors.onImageTextMuted,
      fontSize: 13,
      letterSpacing: 0.2,
      marginTop: 6,
    },
    metaLocation: {
      color: colors.onImageText,
      fontSize: 12,
      marginTop: 2,
      textShadowColor: colors.onImageShadow,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    metaTitle: {
      width: '100%',
      color: colors.onImageText,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      textShadowColor: colors.onImageShadowStrong,
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
      backgroundColor: colors.onImageDivider,
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
    templateTextLayer: {
      position: 'absolute',
      zIndex: 180,
      elevation: 180,
    },
    templateTextValue: {
      color: '#FFFFFF',
    },
    templateTextValueAccent: {
      fontWeight: '900',
      fontSize: 22,
      letterSpacing: 0.2,
    },
    watermark: {
      position: 'absolute',
      right: 14,
      bottom: 16,
      color: colors.watermarkOnImage,
      fontWeight: '800',
      letterSpacing: 1,
      zIndex: 5000,
      elevation: 5000,
    },
  });
}
