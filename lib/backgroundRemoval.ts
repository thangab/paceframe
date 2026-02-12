export async function removeBackgroundOnDevice(imageUri: string): Promise<string> {
  try {
    const module = await import('react-native-background-remover');
    const resultUri = await module.removeBackground(imageUri);

    if (!resultUri || typeof resultUri !== 'string') {
      throw new Error('Background remover returned an invalid image URI.');
    }

    return resultUri;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    throw new Error(
      `On-device background removal unavailable. Install react-native-background-remover and run a development build. Details: ${message}`,
    );
  }
}
