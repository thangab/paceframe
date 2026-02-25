import * as FileSystem from 'expo-file-system/legacy';
import type { BackgroundGradient } from '@/types/preview';
import {
  IMAGE_OVERLAY_MAX_INITIAL,
  IMAGE_OVERLAY_MIN_INITIAL,
} from '@/features/preview/config';

export function normalizeLocalUri(path: string) {
  if (
    path.startsWith('https://') ||
    path.startsWith('http://') ||
    path.startsWith('file://') ||
    path.startsWith('content://') ||
    path.startsWith('ph://') ||
    path.startsWith('assets-library://')
  ) {
    return path;
  }
  return `file://${path}`;
}

export function isAppOwnedCacheFile(uri: string) {
  if (!uri.startsWith('file://')) return false;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return false;
  return uri.startsWith(cacheDir) || uri.includes('/Library/Caches/');
}

export function getInitialOverlaySize(
  assetWidth?: number,
  assetHeight?: number,
): { width: number; height: number } {
  if (!assetWidth || !assetHeight) {
    return {
      width: IMAGE_OVERLAY_MAX_INITIAL,
      height: IMAGE_OVERLAY_MAX_INITIAL,
    };
  }

  const maxSide = IMAGE_OVERLAY_MAX_INITIAL;
  const ratio = assetWidth / assetHeight;
  let width = maxSide;
  let height = maxSide;

  if (ratio >= 1) {
    width = maxSide;
    height = width / ratio;
  } else {
    height = maxSide;
    width = height * ratio;
  }

  return {
    width: Math.max(IMAGE_OVERLAY_MIN_INITIAL, Math.round(width)),
    height: Math.max(IMAGE_OVERLAY_MIN_INITIAL, Math.round(height)),
  };
}

export function createRandomGradient(): BackgroundGradient {
  const baseHue = Math.round(Math.random() * 359);
  const hueStep = 38 + Math.round(Math.random() * 46);
  const direction = Math.random() > 0.5 ? 'vertical' : 'horizontal';

  const colorA = hslToHex(baseHue, 76, 54);
  const colorB = hslToHex((baseHue + hueStep) % 360, 70, 50);
  const colorC = hslToHex((baseHue + hueStep * 2) % 360, 74, 58);

  return {
    colors: [colorA, colorB, colorC],
    direction,
  };
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue >= 0 && hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) => {
    const hex = Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');
    return hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
