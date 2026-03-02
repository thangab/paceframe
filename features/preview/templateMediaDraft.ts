import type * as ImagePicker from 'expo-image-picker';
import type { BackgroundGradient } from '@/types/preview';

export type TemplateMediaDraft = {
  v: 2;
  media: ImagePicker.ImagePickerAsset | null;
  backgroundGradient: BackgroundGradient | null;
  autoSubjectUri: string | null;
  autoSubjectSourceUri: string | null;
};

export type TemplateMediaHydrationState = {
  key: string | null;
  loading: boolean;
  hasStoredDraft: boolean;
};

function sanitizeTemplateMediaAsset(
  input: unknown,
): ImagePicker.ImagePickerAsset | null {
  if (typeof input !== 'object' || !input) return null;
  const source = input as Record<string, unknown>;
  const uri = typeof source.uri === 'string' ? source.uri.trim() : '';
  if (!uri) return null;
  return {
    uri,
    type: source.type === 'video' ? 'video' : 'image',
    width: typeof source.width === 'number' ? source.width : 0,
    height: typeof source.height === 'number' ? source.height : 0,
    fileName:
      typeof source.fileName === 'string' || source.fileName === null
        ? source.fileName
        : null,
    fileSize: typeof source.fileSize === 'number' ? source.fileSize : undefined,
    mimeType: typeof source.mimeType === 'string' ? source.mimeType : undefined,
    duration: typeof source.duration === 'number' ? source.duration : undefined,
    assetId: typeof source.assetId === 'string' ? source.assetId : undefined,
    base64:
      typeof source.base64 === 'string' || source.base64 === null
        ? source.base64
        : null,
    exif:
      typeof source.exif === 'object' && source.exif !== null
        ? (source.exif as Record<string, unknown>)
        : null,
  };
}

export function sanitizeTemplateMediaDraft(
  input: unknown,
): TemplateMediaDraft | null {
  if (typeof input !== 'object' || !input) return null;
  const source = input as Record<string, unknown>;
  const media = sanitizeTemplateMediaAsset(source.media);
  const version = source.v === 2 ? 2 : 1;
  const autoSubjectUri =
    version === 2 && typeof source.autoSubjectUri === 'string'
      ? source.autoSubjectUri.trim() || null
      : null;
  const autoSubjectSourceUri =
    version === 2 && typeof source.autoSubjectSourceUri === 'string'
      ? source.autoSubjectSourceUri.trim() || null
      : null;
  const gradientCandidate = source.backgroundGradient;
  let backgroundGradient: BackgroundGradient | null = null;
  if (typeof gradientCandidate === 'object' && gradientCandidate !== null) {
    const candidateRecord = gradientCandidate as Record<string, unknown>;
    const colorsCandidate = candidateRecord.colors;
    if (
      Array.isArray(colorsCandidate) &&
      colorsCandidate.length === 3 &&
      colorsCandidate.every((value) => typeof value === 'string')
    ) {
      backgroundGradient = {
        colors: colorsCandidate as [string, string, string],
        direction:
          candidateRecord.direction === 'horizontal'
            ? 'horizontal'
            : 'vertical',
      };
    }
  }
  return {
    v: 2,
    media,
    backgroundGradient,
    autoSubjectUri,
    autoSubjectSourceUri,
  };
}
