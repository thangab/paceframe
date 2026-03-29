import type { StatsLayout } from '@/types/preview';
import { getLayoutPreviewHeight as getConfiguredLayoutPreviewHeight } from '@/lib/previewLayouts';

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function hsvToHex(h: number, s: number, v: number) {
  const normalizedHue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const c = value * sat;
  const x = c * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const m = value - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (normalizedHue < 60) {
    r = c;
    g = x;
  } else if (normalizedHue < 120) {
    r = x;
    g = c;
  } else if (normalizedHue < 180) {
    g = c;
    b = x;
  } else if (normalizedHue < 240) {
    g = x;
    b = c;
  } else if (normalizedHue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function isSameSunsetPrimaryGradient(
  a: [string, string, string],
  b: [string, string, string],
) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function getLayoutPreviewHeight(layout: StatsLayout) {
  return getConfiguredLayoutPreviewHeight(layout);
}
