import { useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

  async function handleMockLogin() {
    try {
      setIsBusy(true);
      setError(null);
      await login(getMockTokens());
      router.replace('/activities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mock login failed.');
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

      {!isMockStravaEnabled() ? (
        <Pressable
          style={({ pressed }) => [
            styles.mockCard,
            pressed ? styles.mockCardPressed : null,
          ]}
          onPress={handleMockLogin}
          disabled={isBusy}
        >
          <View style={styles.mockIconWrap}>
            <Text style={styles.mockIcon}>✦</Text>
          </View>
          <View style={styles.mockCopy}>
            <Text style={styles.mockTitle}>Try Mock Activity</Text>
            <Text style={styles.mockSubtitle}>
              No Strava account? Use demo data to see how it works.
            </Text>
          </View>
          <Text style={styles.mockArrow}>›</Text>
        </Pressable>
      ) : null}

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
  mockCard: {
    marginTop: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,255,84,0.35)',
    backgroundColor: '#222712',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mockCardPressed: {
    opacity: 0.9,
  },
  mockIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#D4FF54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockIcon: {
    color: '#101404',
    fontSize: 24,
    fontWeight: '900',
  },
  mockCopy: {
    flex: 1,
  },
  mockTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  mockSubtitle: {
    color: '#B7BF9A',
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
  },
  mockArrow: {
    color: '#D4FF54',
    fontSize: 30,
    lineHeight: 32,
  },
});
