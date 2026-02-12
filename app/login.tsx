import { useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing } from '@/constants/theme';
import {
  exchangeCodeWithSupabase,
  getMockTokens,
  isMockStravaEnabled,
} from '@/lib/strava';
import { useAuthStore } from '@/store/authStore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Strava validates redirect host against "Authorization Callback Domain".
  // Keep host as localhost for native deep link compatibility.
  const redirectUri = 'paceframe://localhost/oauth';

  async function handleLogin() {
    if (isMockStravaEnabled()) {
      await login(getMockTokens());
      router.replace('/activities');
      return;
    }

    if (!clientId) {
      setError('Missing EXPO_PUBLIC_STRAVA_CLIENT_ID in .env');
      return;
    }
    if (!/^\d+$/.test(clientId)) {
      setError(
        `Invalid EXPO_PUBLIC_STRAVA_CLIENT_ID: "${clientId}". Expected numeric Strava Client ID.`,
      );
      return;
    }

    try {
      setIsBusy(true);
      setError(null);

      const authUrl =
        `https://www.strava.com/oauth/mobile/authorize?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&approval_prompt=auto` +
        `&scope=read,activity:read_all`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== 'success') {
        setIsBusy(false);
        return;
      }

      const callbackUrl = new URL(result.url);
      const code = callbackUrl.searchParams.get('code');
      if (!code) {
        throw new Error('Missing authorization code from Strava.');
      }

      const tokens = await exchangeCodeWithSupabase({
        code,
        redirectUri,
      });

      await login(tokens);
      router.replace('/activities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PaceFrame</Text>
      <Text style={styles.subtitle}>
        Create beautiful run cards from your Strava activities.
      </Text>

      <PrimaryButton
        label={
          isBusy
            ? 'Connecting...'
            : isMockStravaEnabled()
              ? 'Continue (Mock Mode)'
              : 'Connect Strava'
        }
        onPress={handleLogin}
        disabled={isBusy}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.hint}>
        Use `EXPO_PUBLIC_USE_MOCK_STRAVA=true` in development to bypass live
        Strava activity calls.
      </Text>
      <Text style={styles.hint}>Client ID loaded: {clientId || 'NO'}</Text>
      <Text style={styles.hint}>Redirect URI: {redirectUri}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
  },
  hint: {
    color: colors.textMuted,
    marginTop: spacing.md,
    fontSize: 13,
  },
});
