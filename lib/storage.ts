import * as SecureStore from 'expo-secure-store';
import {
  AuthTokens,
  LegacyAuthTokens,
  PersistedAuthState,
} from '@/types/strava';

const TOKENS_KEY = 'paceframe.tokens';

function isPersistedAuthState(value: unknown): value is PersistedAuthState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as PersistedAuthState;
  return 'connections' in candidate && typeof candidate.connections === 'object';
}

function normalizeLegacyTokens(tokens: LegacyAuthTokens): PersistedAuthState {
  const provider = tokens.provider ?? 'strava';
  return {
    activeProvider: provider,
    connections: {
      [provider]: {
        ...tokens,
        provider,
      } as AuthTokens,
    },
  };
}

export async function saveAuthState(state: PersistedAuthState) {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(state));
}

export async function getAuthState(): Promise<PersistedAuthState | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedAuthState | LegacyAuthTokens;
    if (isPersistedAuthState(parsed)) {
      return parsed;
    }
    return normalizeLegacyTokens(parsed as LegacyAuthTokens);
  } catch {
    return null;
  }
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}
