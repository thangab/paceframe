import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

type Props = {
  initialX: number;
  initialY: number;
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
  rotationSnapThresholdDeg?: number;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function DraggableBlock({
  initialX,
  initialY,
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
  rotationSnapThresholdDeg = 2,
}: Props) {
  const tx = useSharedValue(initialX);
  const ty = useSharedValue(initialY);
  const scale = useSharedValue(1);
  const dynamicRotationDeg = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);

  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);
  const startScale = useSharedValue(1);
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

  const normalizeAngle = (deg: number) => {
    'worklet';
    let v = deg % 360;
    if (v > 180) v -= 360;
    if (v < -180) v += 360;
    return v;
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
      }

      if (canvasHeight && height.value > 0) {
        // Same logic for Y axis: center is independent from scale factor.
        const centerY = nextY + height.value / 2;
        const deltaToCenterY = centerY - canvasHeight / 2;
        if (Math.abs(deltaToCenterY) <= snapThreshold) {
          nextY -= deltaToCenterY;
          showHorizontal = true;
        }
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
      if (onInteractionChange) {
        runOnJS(emitInteraction)(false);
      }
    })
    .onFinalize(() => {
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
      if (onInteractionChange) {
        runOnJS(emitInteraction)(false);
      }
      if (onRotationGuideChange) {
        lastShowRotationGuide.value = false;
        runOnJS(emitRotationGuide)(false);
      }
    })
    .onFinalize(() => {
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
      if (onTap) {
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

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
          height.value = event.nativeEvent.layout.height;
        }}
        style={[{ position: 'absolute', left: 0, top: 0 }, style, animatedStyle]}
      >
        {selected ? (
          <View
            pointerEvents="none"
            style={[
              styles.selectionOutline,
              typeof outlineRadius === 'number'
                ? { borderRadius: outlineRadius }
                : null,
            ]}
          />
        ) : null}
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  selectionOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#22D3EE',
  },
});
