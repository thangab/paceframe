import { ReactNode, useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  initialX: number;
  initialY: number;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  rotationDeg?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  snapThreshold?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  selected?: boolean;
  outlineRadius?: number;
  onSelect?: () => void;
  onTap?: () => void;
  onDragGuideChange?: (guides: { showVertical: boolean; showHorizontal: boolean }) => void;
  onInteractionChange?: (active: boolean) => void;
  onRotationGuideChange?: (active: boolean) => void;
  onTransformEnd?: (next: {
    x: number;
    y: number;
    scale: number;
    rotationDeg: number;
  }) => void;
  rotationSnapThresholdDeg?: number;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function getAxisBounds(canvasSize: number, layerSize: number) {
  'worklet';
  const overflowAllowance = layerSize * 0.5;
  return {
    min: -overflowAllowance,
    max: canvasSize - overflowAllowance,
  };
}

export function DraggableBlock({
  initialX,
  initialY,
  initialScale = 1,
  minScale = 0.7,
  maxScale = 2.8,
  rotationDeg = 0,
  canvasWidth,
  canvasHeight,
  snapThreshold = 8,
  style,
  children,
  selected,
  outlineRadius,
  onSelect,
  onTap,
  onDragGuideChange,
  onInteractionChange,
  onRotationGuideChange,
  onTransformEnd,
  rotationSnapThresholdDeg = 2,
}: Props) {
  const colors = useThemeColors();
  const tx = useSharedValue(initialX);
  const ty = useSharedValue(initialY);
  const scale = useSharedValue(initialScale);
  const dynamicRotationDeg = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);

  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);
  const startScale = useSharedValue(initialScale);
  const startRotationDeg = useSharedValue(0);
  const lastShowVertical = useSharedValue(false);
  const lastShowHorizontal = useSharedValue(false);
  const lastShowRotationGuide = useSharedValue(false);

  const emitGuides = (showVertical: boolean, showHorizontal: boolean) => {
    onDragGuideChange?.({ showVertical, showHorizontal });
  };
  const emitInteraction = (active: boolean) => {
    onInteractionChange?.(active);
  };
  const emitRotationGuide = (active: boolean) => {
    onRotationGuideChange?.(active);
  };
  const emitTransformEnd = (
    x: number,
    y: number,
    nextScale: number,
    nextRotationDeg: number,
  ) => {
    onTransformEnd?.({
      x,
      y,
      scale: nextScale,
      rotationDeg: nextRotationDeg,
    });
  };

  const normalizeAngle = (deg: number) => {
    'worklet';
    let v = deg % 360;
    if (v > 180) v -= 360;
    if (v < -180) v += 360;
    return v;
  };

  const clampInsideCanvas = () => {
    'worklet';
    if (!canvasWidth || !canvasHeight || width.value <= 0 || height.value <= 0) {
      return;
    }

    const xBounds = getAxisBounds(canvasWidth, width.value);
    const yBounds = getAxisBounds(canvasHeight, height.value);
    tx.value = clamp(tx.value, xBounds.min, xBounds.max);
    ty.value = clamp(ty.value, yBounds.min, yBounds.max);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      if (onSelect) {
        runOnJS(onSelect)();
      }
      if (onInteractionChange) {
        runOnJS(emitInteraction)(true);
      }
    })
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((event: any) => {
      let nextX = startX.value + event.translationX;
      let nextY = startY.value + event.translationY;
      let showVertical = false;
      let showHorizontal = false;

      if (canvasWidth && width.value > 0) {
        // Scale is applied around center, so visual center stays at x + width/2.
        const centerX = nextX + width.value / 2;
        const deltaToCenterX = centerX - canvasWidth / 2;
        if (Math.abs(deltaToCenterX) <= snapThreshold) {
          nextX -= deltaToCenterX;
          showVertical = true;
        }

        const xBounds = getAxisBounds(canvasWidth, width.value);
        nextX = clamp(nextX, xBounds.min, xBounds.max);
      }

      if (canvasHeight && height.value > 0) {
        // Same logic for Y axis: center is independent from scale factor.
        const centerY = nextY + height.value / 2;
        const deltaToCenterY = centerY - canvasHeight / 2;
        if (Math.abs(deltaToCenterY) <= snapThreshold) {
          nextY -= deltaToCenterY;
          showHorizontal = true;
        }

        const yBounds = getAxisBounds(canvasHeight, height.value);
        nextY = clamp(nextY, yBounds.min, yBounds.max);
      }

      tx.value = nextX;
      ty.value = nextY;

      if (
        onDragGuideChange &&
        (showVertical !== lastShowVertical.value ||
          showHorizontal !== lastShowHorizontal.value)
      ) {
        lastShowVertical.value = showVertical;
        lastShowHorizontal.value = showHorizontal;
        runOnJS(emitGuides)(showVertical, showHorizontal);
      }
    })
    .onEnd(() => {
      clampInsideCanvas();
      if (onTransformEnd) {
        runOnJS(emitTransformEnd)(
          tx.value,
          ty.value,
          scale.value,
          rotationDeg + dynamicRotationDeg.value,
        );
      }
      if (onInteractionChange) {
        runOnJS(emitInteraction)(false);
      }
      if (onDragGuideChange) {
        lastShowVertical.value = false;
        lastShowHorizontal.value = false;
        runOnJS(emitGuides)(false, false);
      }
    })
    .onFinalize(() => {
      clampInsideCanvas();
      if (onTransformEnd) {
        runOnJS(emitTransformEnd)(
          tx.value,
          ty.value,
          scale.value,
          rotationDeg + dynamicRotationDeg.value,
        );
      }
      if (onInteractionChange) {
        runOnJS(emitInteraction)(false);
      }
      if (onDragGuideChange) {
        lastShowVertical.value = false;
        lastShowHorizontal.value = false;
        runOnJS(emitGuides)(false, false);
      }
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      if (onInteractionChange) {
        runOnJS(emitInteraction)(true);
      }
    })
    .onUpdate((event: any) => {
      scale.value = clamp(startScale.value * event.scale, minScale, maxScale);
    })
    .onEnd(() => {
      clampInsideCanvas();
      if (onTransformEnd) {
        runOnJS(emitTransformEnd)(
          tx.value,
          ty.value,
          scale.value,
          rotationDeg + dynamicRotationDeg.value,
        );
      }
      if (onInteractionChange) {
        runOnJS(emitInteraction)(false);
      }
    })
    .onFinalize(() => {
      clampInsideCanvas();
      if (onTransformEnd) {
        runOnJS(emitTransformEnd)(
          tx.value,
          ty.value,
          scale.value,
          rotationDeg + dynamicRotationDeg.value,
        );
      }
      if (onInteractionChange) {
        runOnJS(emitInteraction)(false);
      }
    });

  const rotate = Gesture.Rotation()
    .onStart(() => {
      startRotationDeg.value = dynamicRotationDeg.value;
      if (onInteractionChange) {
        runOnJS(emitInteraction)(true);
      }
    })
    .onUpdate((event: any) => {
      // event.rotation is radians; convert to degrees.
      let nextRotation =
        startRotationDeg.value + (event.rotation * 180) / Math.PI;
      const total = rotationDeg + nextRotation;
      const normalized = normalizeAngle(total);
      const shouldSnap = Math.abs(normalized) <= rotationSnapThresholdDeg;

      if (shouldSnap) {
        // Snap to perfectly upright (0° total rotation).
        nextRotation = -rotationDeg;
      }

      dynamicRotationDeg.value = nextRotation;

      if (onRotationGuideChange && shouldSnap !== lastShowRotationGuide.value) {
        lastShowRotationGuide.value = shouldSnap;
        runOnJS(emitRotationGuide)(shouldSnap);
      }
    })
    .onEnd(() => {
      clampInsideCanvas();
      if (onTransformEnd) {
        runOnJS(emitTransformEnd)(
          tx.value,
          ty.value,
          scale.value,
          rotationDeg + dynamicRotationDeg.value,
        );
      }
      if (onInteractionChange) {
        runOnJS(emitInteraction)(false);
      }
      if (onRotationGuideChange) {
        lastShowRotationGuide.value = false;
        runOnJS(emitRotationGuide)(false);
      }
    })
    .onFinalize(() => {
      clampInsideCanvas();
      if (onTransformEnd) {
        runOnJS(emitTransformEnd)(
          tx.value,
          ty.value,
          scale.value,
          rotationDeg + dynamicRotationDeg.value,
        );
      }
      if (onInteractionChange) {
        runOnJS(emitInteraction)(false);
      }
      if (onRotationGuideChange) {
        lastShowRotationGuide.value = false;
        runOnJS(emitRotationGuide)(false);
      }
    });

  const tap = Gesture.Tap()
    .maxDuration(180)
    .maxDistance(6)
    .onEnd((_event, success) => {
      if (!success) return;
      if (onSelect) {
        runOnJS(onSelect)();
      }
      // Only trigger tap action when the block was already selected before this tap.
      if (onTap && selected) {
        runOnJS(onTap)();
      }
    });

  const gesture = Gesture.Simultaneous(tap, pan, pinch, rotate);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotateZ: `${rotationDeg + dynamicRotationDeg.value}deg` },
    ],
  }));

  useEffect(() => {
    runOnUI(clampInsideCanvas)();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    tx.value = initialX;
    ty.value = initialY;
    scale.value = initialScale;
    dynamicRotationDeg.value = 0;
    runOnUI(clampInsideCanvas)();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScale, initialX, initialY, rotationDeg]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(event) => {
          const measuredWidth = event.nativeEvent.layout.width;
          const measuredHeight = event.nativeEvent.layout.height;
          width.value = measuredWidth;
          height.value = measuredHeight;

          if (canvasWidth && canvasHeight) {
            const xBounds = getAxisBounds(canvasWidth, measuredWidth);
            const yBounds = getAxisBounds(canvasHeight, measuredHeight);
            tx.value = clamp(tx.value, xBounds.min, xBounds.max);
            ty.value = clamp(ty.value, yBounds.min, yBounds.max);
          }
        }}
        style={[{ position: 'absolute', left: 0, top: 0 }, style, animatedStyle]}
      >
        {children}
        {selected ? (
          <View
            pointerEvents="none"
            style={[
              styles.selectionOutline,
              { borderColor: colors.selectionOutline },
              typeof outlineRadius === 'number'
                ? { borderRadius: outlineRadius }
                : null,
            ]}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  selectionOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
