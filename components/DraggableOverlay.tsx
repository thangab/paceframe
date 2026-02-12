import { StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

type Props = {
  text: string;
  initialX: number;
  initialY: number;
  selected?: boolean;
  onSelect?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function DraggableOverlay({
  text,
  initialX,
  initialY,
  selected,
  onSelect,
  containerStyle,
  textStyle,
}: Props) {
  const tx = useSharedValue(initialX);
  const ty = useSharedValue(initialY);
  const scale = useSharedValue(1);

  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);
  const startScale = useSharedValue(1);

  const tap = Gesture.Tap().onEnd(() => {
    if (onSelect) {
      runOnJS(onSelect)();
    }
  });

  const pan = Gesture.Pan()
    .onBegin(() => {
      if (onSelect) {
        runOnJS(onSelect)();
      }
    })
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((event: any) => {
      tx.value = startX.value + event.translationX;
      ty.value = startY.value + event.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event: any) => {
      scale.value = clamp(startScale.value * event.scale, 0.6, 3.2);
    });

  const gesture = Gesture.Simultaneous(tap, pan, pinch);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.overlay, containerStyle, selected && styles.selected, animatedStyle]}
      >
        <Text style={[styles.text, textStyle]}>{text}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'rgba(17,24,39,0.66)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  selected: {
    borderColor: '#fff',
    borderWidth: 2,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
