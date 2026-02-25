import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  ImageSourcePropType,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  images: ImageSourcePropType[];
};

const warmModules = new Set<number>();

function getLocalModuleIds(images: ImageSourcePropType[]) {
  return images.filter((img): img is number => typeof img === 'number');
}

async function preloadLocalModules(moduleIds: number[]) {
  const missing = moduleIds.filter((id) => !warmModules.has(id));
  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (id) => {
      try {
        await Asset.fromModule(id).downloadAsync();
        warmModules.add(id);
      } catch {
        // Keep UI resilient if one asset fails to prewarm.
      }
    }),
  );
}

const CARD_W = 150;
const CARD_H = 260;
const GAP = 22;

const GRID = [
  { c: 0, r: 0 },
  { c: 1, r: 0 },
  { c: 2, r: 0 },
  { c: 0, r: 1 },
  { c: 1, r: 1 },
  { c: 2, r: 1 },
];

const MOSAIC_W = CARD_W * 3 + GAP * 2;
const MOSAIC_H = CARD_H * 2 + GAP;

const Card = memo(function Card({
  src,
  i,
  offsetY = 0,
}: {
  src: ImageSourcePropType;
  i: number;
  offsetY?: number;
}) {
  const g = GRID[i];

  return (
    <View
      style={[
        styles.card,
        {
          transform: [
            { translateX: g.c * (CARD_W + GAP) },
            { translateY: g.r * (CARD_H + GAP) + offsetY },
            { rotate: `${i % 2 === 0 ? -5 : 5}deg` },
          ],
        },
      ]}
    >
      <Animated.Image source={src} style={styles.img} />
    </View>
  );
});

export default function LoginHeroCarousel({ images }: Props) {
  const { width } = useWindowDimensions();
  const moduleIds = useMemo(() => getLocalModuleIds(images), [images]);
  const [isWarm, setIsWarm] = useState(() =>
    moduleIds.every((id) => warmModules.has(id)),
  );

  const scale = width / 390;

  // infinite vertical loop
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(-MOSAIC_H, {
        duration: 32000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [y]);

  useEffect(() => {
    let cancelled = false;
    if (moduleIds.length === 0 || isWarm) return;

    preloadLocalModules(moduleIds).finally(() => {
      if (!cancelled) setIsWarm(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isWarm, moduleIds]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <View style={styles.root}>
      {/* CENTERED MOSAIC WITH LOOP */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: width / 2 - (MOSAIC_W * scale) / 2,
            top: -120 * scale,
            width: MOSAIC_W * scale,
            height: MOSAIC_H * 2 * scale, // double for loop
            transform: [{ scale }, { rotate: '-12deg' }],
            opacity: isWarm ? 1 : 0.01,
          },
          animated,
        ]}
      >
        {/* GRID A */}
        {images.slice(0, 6).map((img, i) => (
          <Card key={`a-${i}`} src={img} i={i} />
        ))}

        {/* GRID B (duplicate below) */}
        {images.slice(0, 6).map((img, i) => (
          <Card key={`b-${i}`} src={img} i={i} offsetY={MOSAIC_H} />
        ))}
      </Animated.View>

      <LinearGradient
        colors={['rgba(19,27,46,0)', '#131B2E']}
        style={styles.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 430,
    backgroundColor: '#131B2E',
    overflow: 'hidden',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 300,
  },
});
