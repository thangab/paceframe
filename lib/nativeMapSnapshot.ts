import { NativeModules, Platform } from 'react-native';

type GenerateMapSnapshotParams = {
  polyline: string;
  width: number;
  height: number;
  strokeColorHex?: string;
};

type NativeMapSnapshotModule = {
  generateMapSnapshot(params: GenerateMapSnapshotParams): Promise<string>;
};

const nativeModule = NativeModules.PaceFrameMapSnapshot as
  | NativeMapSnapshotModule
  | undefined;

export async function generateMapSnapshot(
  params: GenerateMapSnapshotParams,
): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new Error('Native map snapshot is available on iOS only.');
  }

  if (!nativeModule?.generateMapSnapshot) {
    throw new Error(
      'Native map snapshot module unavailable. Rebuild iOS app after updating native files.',
    );
  }

  return nativeModule.generateMapSnapshot(params);
}
