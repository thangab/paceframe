import * as FileSystem from 'expo-file-system/legacy';
import {
  AlphaType,
  ColorType,
  ImageFormat,
  Skia,
} from '@shopify/react-native-skia';

export type TrimmedStickerResult = {
  uri: string;
  width: number;
  height: number;
};

export async function trimStickerToOpaqueBounds(
  stickerUri: string,
): Promise<TrimmedStickerResult | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(stickerUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const encoded = Skia.Data.fromBase64(base64);
    if (!encoded) return null;

    const image = Skia.Image.MakeImageFromEncoded(encoded);
    if (!image) return null;

    const width = image.width();
    const height = image.height();
    if (width <= 0 || height <= 0) return null;

    const pixels = image.readPixels(0, 0, {
      width,
      height,
      alphaType: AlphaType.Unpremul,
      colorType: ColorType.RGBA_8888,
    });
    if (!pixels || pixels.length < width * height * 4) return null;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha <= 10) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < 0 || maxY < 0) return null;

    const padding = 2;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropRight = Math.min(width - 1, maxX + padding);
    const cropBottom = Math.min(height - 1, maxY + padding);
    const cropWidth = cropRight - cropX + 1;
    const cropHeight = cropBottom - cropY + 1;

    if (cropWidth >= width && cropHeight >= height) {
      return { uri: stickerUri, width, height };
    }

    const surface = Skia.Surface.Make(cropWidth, cropHeight);
    if (!surface) return { uri: stickerUri, width, height };

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));
    const paint = Skia.Paint();
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(cropX, cropY, cropWidth, cropHeight),
      Skia.XYWHRect(0, 0, cropWidth, cropHeight),
      paint,
      true,
    );

    const snapshot = surface.makeImageSnapshot();
    const trimmedBase64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);
    if (!trimmedBase64) return { uri: stickerUri, width, height };

    const cacheDir = FileSystem.cacheDirectory ?? '';
    if (!cacheDir) return { uri: stickerUri, width, height };

    const trimmedUri =
      `${cacheDir}paceframe-sticker-${Date.now()}-${Math.round(Math.random() * 1000)}.png`;

    await FileSystem.writeAsStringAsync(trimmedUri, trimmedBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { uri: trimmedUri, width: cropWidth, height: cropHeight };
  } catch {
    return null;
  }
}
