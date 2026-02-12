import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '@/types/strava';

const TOKENS_KEY = 'paceframe.tokens';

export async function saveTokens(tokens: AuthTokens) {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function getTokens(): Promise<AuthTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}
