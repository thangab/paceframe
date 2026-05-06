import { NativeModules, Platform } from 'react-native';

type NativeClipboardModule = {
  copyPngBase64(base64: string): Promise<void>;
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
