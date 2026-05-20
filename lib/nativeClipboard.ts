import { NativeModules, Platform } from 'react-native';

type NativeClipboardModule = {
  copyPngBase64(base64: string): Promise<void>;
  shareImageBase64ToInstagramStory(
    base64: string,
    sourceApplication: string,
  ): Promise<void>;
  shareVideoToInstagramStory(
    uri: string,
    sourceApplication: string,
  ): Promise<void>;
};

const nativeModule = NativeModules.PaceFrameClipboard as
  | NativeClipboardModule
  | undefined;

export async function copyPngBase64ToClipboard(base64: string) {
  if (Platform.OS !== 'ios') {
    return null;
  }

  if (!nativeModule?.copyPngBase64) {
    throw new Error(
      'Native clipboard module unavailable. Rebuild the iOS app after updating native files.',
    );
  }

  await nativeModule.copyPngBase64(base64);
  return true;
}

export async function shareImageBase64ToInstagramStory(
  base64: string,
  sourceApplication: string,
) {
  if (Platform.OS !== 'ios') {
    return null;
  }

  if (!nativeModule?.shareImageBase64ToInstagramStory) {
    throw new Error(
      'Native Instagram sharing is unavailable. Rebuild the iOS app after updating native files.',
    );
  }

  await nativeModule.shareImageBase64ToInstagramStory(base64, sourceApplication);
  return true;
}

export async function shareVideoToInstagramStory(
  uri: string,
  sourceApplication: string,
) {
  if (Platform.OS !== 'ios') {
    return null;
  }

  if (!nativeModule?.shareVideoToInstagramStory) {
    throw new Error(
      'Native Instagram sharing is unavailable. Rebuild the iOS app after updating native files.',
    );
  }

  await nativeModule.shareVideoToInstagramStory(uri, sourceApplication);
  return true;
}
