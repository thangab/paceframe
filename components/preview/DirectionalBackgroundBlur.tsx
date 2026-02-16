import { StyleProp, ViewStyle } from 'react-native';
import {
  Canvas,
  Fill,
  ImageShader,
  RuntimeShader,
  Skia,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

type Props = {
  image: SkImage;
  width: number;
  height: number;
  direction: { x: number; y: number };
  intensity: number;
  samples?: number;
  style?: StyleProp<ViewStyle>;
};

const DIRECTIONAL_BLUR_EFFECT = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 resolution;
uniform float2 direction;
uniform float intensity;
uniform float samples;

half4 main(float2 xy) {
  float2 dir = normalize(direction);
  if (length(direction) < 0.0001) {
    dir = float2(1.0, 0.0);
  }

  float sampleCount = clamp(samples, 1.0, 12.0);
  half4 color = half4(0.0);
  float total = 0.0;

  for (int i = 0; i < 12; i++) {
    if (float(i) >= sampleCount) {
      break;
    }
    float t = (float(i) / max(sampleCount - 1.0, 1.0) - 0.5) * intensity;
    float2 samplePos = xy + dir * t;
    samplePos = clamp(samplePos, float2(0.0), resolution);
    color += image.eval(samplePos);
    total += 1.0;
  }

  return color / max(total, 1.0);
}
`);

export function DirectionalBackgroundBlur({
  image,
  width,
  height,
  direction,
  intensity,
  samples = 12,
  style,
}: Props) {
  if (!DIRECTIONAL_BLUR_EFFECT) return null;

  return (
    <Canvas style={style}>
      <Fill>
        <RuntimeShader
          source={DIRECTIONAL_BLUR_EFFECT}
          uniforms={{
            resolution: [width, height],
            direction: [direction.x, direction.y],
            intensity,
            samples,
          }}
        >
          <ImageShader
            image={image}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
        </RuntimeShader>
      </Fill>
    </Canvas>
  );
}
