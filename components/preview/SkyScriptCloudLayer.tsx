import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, ImageSVG, Skia } from '@shopify/react-native-skia';

type Props = {
  width: number;
  height: number;
  canvasScaleX: number;
  canvasScaleY: number;
  distanceText: string;
  paceText: string;
};

type ParsedSvg = NonNullable<ReturnType<typeof Skia.SVG.MakeFromString>>;

type Puff = {
  cx: number;
  cy: number;
  r: number;
};

type GlyphSpec = {
  width: number;
  paths: string[];
  puffs: Puff[];
};

type GlyphRun = {
  key: string;
  svg: ParsedSvg;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

type BlockSpec = {
  key: string;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
  lineHeight?: number;
  letterSpacing: number;
  align?: 'left' | 'center' | 'right';
  jitterX?: number;
  jitterY?: number;
  opacity?: number;
};

const GLYPH_HEIGHT = 100;

const CLOUD_GLYPHS: Record<string, GlyphSpec> = {
  ' ': { width: 30, paths: [], puffs: [] },
  '.': { width: 20, paths: [], puffs: [{ cx: 10, cy: 82, r: 8 }] },
  ':': {
    width: 26,
    paths: [],
    puffs: [
      { cx: 13, cy: 32, r: 8 },
      { cx: 13, cy: 74, r: 8 },
    ],
  },
  '/': {
    width: 46,
    paths: ['M10 88 L36 12'],
    puffs: [
      { cx: 12, cy: 84, r: 7 },
      { cx: 23, cy: 50, r: 7 },
      { cx: 34, cy: 16, r: 7 },
    ],
  },
  '0': {
    width: 68,
    paths: ['M50 18 Q68 30 68 50 Q68 72 50 86 Q34 96 18 82 Q4 70 4 46 Q4 26 20 16 Q34 8 50 18'],
    puffs: [
      { cx: 16, cy: 28, r: 9 },
      { cx: 50, cy: 22, r: 9 },
      { cx: 58, cy: 52, r: 9 },
      { cx: 40, cy: 82, r: 10 },
      { cx: 14, cy: 68, r: 8 },
    ],
  },
  '1': {
    width: 42,
    paths: ['M22 14 V86', 'M10 26 L22 14 L34 26', 'M10 86 H34'],
    puffs: [
      { cx: 22, cy: 16, r: 8 },
      { cx: 22, cy: 46, r: 8 },
      { cx: 22, cy: 78, r: 8 },
    ],
  },
  '2': {
    width: 66,
    paths: ['M10 28 Q26 10 48 16 Q66 22 60 42 Q56 54 40 64 L12 86 H62'],
    puffs: [
      { cx: 18, cy: 26, r: 8 },
      { cx: 46, cy: 18, r: 9 },
      { cx: 48, cy: 58, r: 9 },
      { cx: 18, cy: 82, r: 8 },
      { cx: 54, cy: 84, r: 8 },
    ],
  },
  '3': {
    width: 66,
    paths: ['M10 22 Q26 10 46 16 Q62 22 56 40 Q50 52 34 54', 'M34 54 Q52 56 58 68 Q62 84 42 88 Q24 90 10 78'],
    puffs: [
      { cx: 18, cy: 20, r: 8 },
      { cx: 46, cy: 18, r: 8 },
      { cx: 42, cy: 54, r: 9 },
      { cx: 50, cy: 80, r: 8 },
      { cx: 16, cy: 76, r: 8 },
    ],
  },
  '4': {
    width: 70,
    paths: ['M54 14 V88', 'M10 54 H58', 'M12 54 L44 16'],
    puffs: [
      { cx: 50, cy: 16, r: 8 },
      { cx: 22, cy: 54, r: 8 },
      { cx: 52, cy: 54, r: 9 },
      { cx: 54, cy: 84, r: 8 },
    ],
  },
  '5': {
    width: 66,
    paths: ['M56 16 H18 L12 46', 'M14 48 Q24 40 40 40 Q60 42 60 64 Q60 88 34 90 Q18 90 10 80'],
    puffs: [
      { cx: 50, cy: 16, r: 8 },
      { cx: 18, cy: 20, r: 8 },
      { cx: 20, cy: 50, r: 8 },
      { cx: 48, cy: 46, r: 9 },
      { cx: 36, cy: 86, r: 9 },
    ],
  },
  '6': {
    width: 66,
    paths: ['M56 20 Q40 10 24 20 Q8 34 8 58 Q10 86 36 88 Q60 88 60 62 Q60 42 38 42 Q20 42 12 56'],
    puffs: [
      { cx: 48, cy: 18, r: 8 },
      { cx: 22, cy: 24, r: 8 },
      { cx: 14, cy: 58, r: 8 },
      { cx: 38, cy: 82, r: 10 },
      { cx: 52, cy: 58, r: 8 },
    ],
  },
  '7': {
    width: 66,
    paths: ['M12 18 H60', 'M58 18 L26 88'],
    puffs: [
      { cx: 18, cy: 18, r: 8 },
      { cx: 50, cy: 18, r: 8 },
      { cx: 42, cy: 46, r: 8 },
      { cx: 28, cy: 82, r: 8 },
    ],
  },
  '8': {
    width: 66,
    paths: [
      'M34 14 Q52 14 54 30 Q54 46 34 50 Q14 54 14 72 Q14 88 34 88 Q54 88 54 70 Q54 52 34 50',
      'M34 14 Q14 14 14 30 Q14 46 34 50',
    ],
    puffs: [
      { cx: 20, cy: 22, r: 8 },
      { cx: 48, cy: 20, r: 8 },
      { cx: 34, cy: 50, r: 9 },
      { cx: 18, cy: 78, r: 8 },
      { cx: 50, cy: 78, r: 8 },
    ],
  },
  '9': {
    width: 66,
    paths: ['M56 44 Q48 58 32 58 Q10 56 8 34 Q8 10 34 10 Q60 10 60 40 Q60 68 44 82 Q28 94 10 82'],
    puffs: [
      { cx: 20, cy: 18, r: 8 },
      { cx: 46, cy: 16, r: 9 },
      { cx: 54, cy: 44, r: 8 },
      { cx: 38, cy: 78, r: 8 },
      { cx: 14, cy: 80, r: 8 },
    ],
  },
  A: {
    width: 74,
    paths: ['M12 88 L30 14 L60 88', 'M20 58 H46'],
    puffs: [
      { cx: 30, cy: 16, r: 9 },
      { cx: 18, cy: 54, r: 8 },
      { cx: 42, cy: 58, r: 8 },
      { cx: 56, cy: 82, r: 8 },
    ],
  },
  C: {
    width: 68,
    paths: ['M58 22 Q42 10 24 18 Q8 30 8 52 Q8 74 24 86 Q44 96 58 82'],
    puffs: [
      { cx: 46, cy: 18, r: 8 },
      { cx: 16, cy: 30, r: 8 },
      { cx: 10, cy: 56, r: 8 },
      { cx: 22, cy: 82, r: 8 },
      { cx: 48, cy: 84, r: 8 },
    ],
  },
  D: {
    width: 72,
    paths: ['M12 14 V88', 'M12 14 Q52 14 62 36 Q70 58 60 76 Q48 92 12 88'],
    puffs: [
      { cx: 12, cy: 20, r: 8 },
      { cx: 14, cy: 54, r: 8 },
      { cx: 44, cy: 18, r: 8 },
      { cx: 60, cy: 42, r: 8 },
      { cx: 46, cy: 84, r: 8 },
    ],
  },
  E: {
    width: 64,
    paths: ['M56 16 H12 V88 H58', 'M12 52 H46'],
    puffs: [
      { cx: 18, cy: 18, r: 8 },
      { cx: 48, cy: 18, r: 8 },
      { cx: 16, cy: 52, r: 8 },
      { cx: 38, cy: 52, r: 8 },
      { cx: 18, cy: 84, r: 8 },
      { cx: 52, cy: 84, r: 8 },
    ],
  },
  I: {
    width: 44,
    paths: ['M10 16 H34', 'M22 16 V88', 'M10 88 H34'],
    puffs: [
      { cx: 22, cy: 18, r: 8 },
      { cx: 22, cy: 50, r: 8 },
      { cx: 22, cy: 84, r: 8 },
    ],
  },
  K: {
    width: 70,
    paths: ['M12 14 V88', 'M58 16 L20 50', 'M22 50 L58 88'],
    puffs: [
      { cx: 12, cy: 18, r: 8 },
      { cx: 12, cy: 54, r: 8 },
      { cx: 48, cy: 22, r: 8 },
      { cx: 40, cy: 48, r: 8 },
      { cx: 52, cy: 80, r: 8 },
    ],
  },
  M: {
    width: 84,
    paths: ['M12 88 V14 L40 56 L68 14 V88'],
    puffs: [
      { cx: 12, cy: 18, r: 8 },
      { cx: 32, cy: 34, r: 8 },
      { cx: 50, cy: 34, r: 8 },
      { cx: 68, cy: 18, r: 8 },
      { cx: 68, cy: 82, r: 8 },
    ],
  },
  N: {
    width: 76,
    paths: ['M12 88 V14 L64 88 V14'],
    puffs: [
      { cx: 12, cy: 18, r: 8 },
      { cx: 12, cy: 82, r: 8 },
      { cx: 38, cy: 50, r: 8 },
      { cx: 64, cy: 18, r: 8 },
      { cx: 64, cy: 82, r: 8 },
    ],
  },
  P: {
    width: 68,
    paths: ['M12 88 V14 H42 Q60 16 60 38 Q60 60 40 60 H12'],
    puffs: [
      { cx: 12, cy: 18, r: 8 },
      { cx: 42, cy: 18, r: 8 },
      { cx: 56, cy: 36, r: 8 },
      { cx: 38, cy: 58, r: 8 },
      { cx: 12, cy: 84, r: 8 },
    ],
  },
  S: {
    width: 66,
    paths: ['M56 20 Q42 10 24 16 Q10 24 16 40 Q22 52 42 56 Q62 60 56 76 Q50 90 24 86 Q14 84 10 76'],
    puffs: [
      { cx: 44, cy: 18, r: 8 },
      { cx: 18, cy: 22, r: 8 },
      { cx: 24, cy: 48, r: 8 },
      { cx: 48, cy: 58, r: 8 },
      { cx: 22, cy: 82, r: 8 },
    ],
  },
  T: {
    width: 68,
    paths: ['M10 18 H58', 'M34 18 V88'],
    puffs: [
      { cx: 14, cy: 18, r: 8 },
      { cx: 34, cy: 18, r: 8 },
      { cx: 54, cy: 18, r: 8 },
      { cx: 34, cy: 52, r: 8 },
      { cx: 34, cy: 84, r: 8 },
    ],
  },
};

const glyphCache = new Map<string, ParsedSvg | null>();

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function buildSvg(spec: GlyphSpec) {
  const pathMarkup = spec.paths
    .map(
      (path) => `
      <path d="${path}" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${path}" fill="none" stroke="#edf6ff" stroke-opacity="0.18" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${path}" fill="none" stroke="#ffffff" stroke-opacity="0.72" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${path}" fill="none" stroke="#ffffff" stroke-opacity="1" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
    `,
    )
    .join('');

  const puffMarkup = spec.puffs
    .map(
      (puff) => `
      <circle cx="${puff.cx}" cy="${puff.cy}" r="${Math.max(2, puff.r - 2)}" fill="#ffffff" fill-opacity="0.14" />
      <circle cx="${puff.cx}" cy="${puff.cy}" r="${Math.max(1.5, puff.r - 4)}" fill="#ffffff" fill-opacity="0.24" />
    `,
    )
    .join('');

  return `<svg viewBox="0 0 ${spec.width} ${GLYPH_HEIGHT}" width="${spec.width}" height="${GLYPH_HEIGHT}" xmlns="http://www.w3.org/2000/svg">${pathMarkup}${puffMarkup}</svg>`;
}

function getGlyph(char: string) {
  const key = char.toUpperCase();
  const spec = CLOUD_GLYPHS[key];
  if (!spec) return null;

  let svg = glyphCache.get(key);
  if (svg === undefined) {
    svg = Skia.SVG.MakeFromString(buildSvg(spec));
    glyphCache.set(key, svg);
  }

  return {
    width: spec.width,
    svg,
  };
}

function measureTextWidth(text: string, fontSize: number, letterSpacing: number) {
  let width = 0;
  Array.from(text).forEach((char, index) => {
    const glyph = getGlyph(char);
    if (!glyph) return;
    width += (glyph.width / GLYPH_HEIGHT) * fontSize;
    if (index < text.length - 1) {
      width += letterSpacing;
    }
  });
  return width;
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  letterSpacing: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (
      currentLine &&
      measureTextWidth(candidate, fontSize, letterSpacing) > maxWidth
    ) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function buildBlockRuns(block: BlockSpec) {
  const lines = wrapText(
    block.text,
    block.maxWidth,
    block.fontSize,
    block.letterSpacing,
  );
  const lineHeight = block.lineHeight ?? block.fontSize * 1.06;
  const runs: GlyphRun[] = [];

  lines.forEach((line, lineIndex) => {
    const lineWidth = measureTextWidth(
      line,
      block.fontSize,
      block.letterSpacing,
    );
    const startX =
      block.align === 'center'
        ? block.x + (block.maxWidth - lineWidth) / 2
        : block.align === 'right'
          ? block.x + block.maxWidth - lineWidth
          : block.x;
    const topY = block.y + lineIndex * lineHeight;
    let cursorX = startX;

    Array.from(line).forEach((char, charIndex) => {
      const glyph = getGlyph(char);
      if (!glyph) return;

      const glyphWidth = (glyph.width / GLYPH_HEIGHT) * block.fontSize;
      if (char !== ' ' && glyph.svg) {
        const seed = hashSeed(`${block.key}-${lineIndex}-${charIndex}-${char}`);
        const jitterX =
          (seededRandom(seed + 1) - 0.5) * (block.jitterX ?? 0);
        const jitterY =
          (seededRandom(seed + 2) - 0.5) * (block.jitterY ?? 0);
        const scale = 0.94 + seededRandom(seed + 3) * 0.12;

        runs.push({
          key: `${block.key}-${lineIndex}-${charIndex}`,
          svg: glyph.svg,
          x: cursorX + jitterX,
          y: topY + jitterY,
          width: glyphWidth * scale,
          height: block.fontSize * scale,
          opacity: block.opacity ?? 1,
        });
      }

      cursorX += glyphWidth + block.letterSpacing;
    });
  });

  return runs;
}

export function SkyScriptCloudLayer({
  width,
  height,
  canvasScaleX,
  canvasScaleY,
  distanceText,
  paceText,
}: Props) {
  const minScale = Math.min(canvasScaleX, canvasScaleY);

  const runs = useMemo(() => {
    const blocks: BlockSpec[] = [
      {
        key: 'distance-label',
        text: 'DISTANCE',
        x: 34 * canvasScaleX,
        y: 112 * canvasScaleY,
        maxWidth: 150 * canvasScaleX,
        fontSize: 16 * minScale,
        letterSpacing: 1.8 * canvasScaleX,
        jitterX: 0.8 * canvasScaleX,
        jitterY: 1.2 * canvasScaleY,
        opacity: 0.98,
      },
      {
        key: 'distance-value',
        text: distanceText.toUpperCase(),
        x: 20 * canvasScaleX,
        y: 146 * canvasScaleY,
        maxWidth: 168 * canvasScaleX,
        fontSize: 44 * minScale,
        lineHeight: 46 * canvasScaleY,
        letterSpacing: 0.8 * canvasScaleX,
        jitterX: 1.2 * canvasScaleX,
        jitterY: 1.6 * canvasScaleY,
        opacity: 1,
      },
      {
        key: 'pace-label',
        text: 'PACE',
        x: 220 * canvasScaleX,
        y: 112 * canvasScaleY,
        maxWidth: 104 * canvasScaleX,
        fontSize: 16 * minScale,
        letterSpacing: 1.8 * canvasScaleX,
        align: 'center',
        jitterX: 0.8 * canvasScaleX,
        jitterY: 1.2 * canvasScaleY,
        opacity: 0.98,
      },
      {
        key: 'pace-value',
        text: paceText.toUpperCase(),
        x: 176 * canvasScaleX,
        y: 146 * canvasScaleY,
        maxWidth: 156 * canvasScaleX,
        fontSize: 38 * minScale,
        lineHeight: 40 * canvasScaleY,
        letterSpacing: 0.6 * canvasScaleX,
        align: 'center',
        jitterX: 1.2 * canvasScaleX,
        jitterY: 1.6 * canvasScaleY,
        opacity: 1,
      },
    ];

    return blocks.flatMap(buildBlockRuns);
  }, [canvasScaleX, canvasScaleY, distanceText, minScale, paceText]);

  if (runs.length === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={{ width, height }}>
        {runs.map((run) => (
          <Group key={run.key} opacity={run.opacity}>
            <ImageSVG
              svg={run.svg}
              x={run.x}
              y={run.y}
              width={run.width}
              height={run.height}
            />
          </Group>
        ))}
      </Canvas>
    </View>
  );
}
