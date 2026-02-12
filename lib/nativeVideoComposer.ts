import { NativeModules, Platform } from 'react-native';

type ComposeParams = {
  videoUri: string;
  overlayUri: string;
};

type VideoComposerNativeModule = {
  composeVideoWithOverlay(params: ComposeParams): Promise<string>;
};

const nativeModule = NativeModules.PaceFrameVideoComposer as
  | VideoComposerNativeModule
  | undefined;

export async function composeVideoWithOverlay({
  videoUri,
  overlayUri,
}: ComposeParams): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new Error('Video + layers export is currently available on iOS only.');
  }

  if (!nativeModule?.composeVideoWithOverlay) {
    throw new Error(
      'Native video composer is unavailable. Rebuild the iOS app after pulling latest changes.',
    );
  }

  return nativeModule.composeVideoWithOverlay({ videoUri, overlayUri });
}
