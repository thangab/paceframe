import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontAwesome6 } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing } from '@/constants/theme';
import { importActivitiesFromHealthKit } from '@/lib/healthkit';
import {
  exchangeCodeWithSupabase,
  getMockTokens,
  isMockStravaEnabled,
} from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const setActivities = useActivityStore((s) => s.setActivities);
  const shouldShowHealthSettings =
    Platform.OS === 'ios' &&
    Boolean(
      error && /(healthkit|authorization|denied|permission)/i.test(error),
    );

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

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
      );

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

  async function handleHealthKitImport() {
    if (Platform.OS !== 'ios') return;

    try {
      setIsBusy(true);
      setError(null);
      const activities = await importActivitiesFromHealthKit();
      if (activities.length === 0) {
        setError('No HealthKit workouts found.');
        return;
      }
      // Keep auth flow consistent for guarded routes.
      await login(getMockTokens());
      setActivities(activities, 'healthkit');
      router.replace('/activities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'HealthKit import failed.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.brandMark}>
          <MaterialCommunityIcons name="run-fast" size={26} color="#111500" />
        </View>
        <Text style={styles.title}>PaceFrame</Text>
        <Text style={styles.subtitle}>
          Create beautiful run cards from your Strava activities.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color="#FCA5A5"
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={
              isBusy
                ? 'Connecting...'
                : isMockStravaEnabled()
                  ? 'Continue (Mock Mode)'
                  : 'Connect Strava'
            }
            iconElement={<FontAwesome6 name="strava" size={16} color="#111500" />}
            onPress={handleLogin}
            disabled={isBusy}
          />

          {!isMockStravaEnabled() ? (
            <Pressable
              onPress={handleMockLogin}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.demoCard,
                pressed && !isBusy ? styles.demoCardPressed : null,
                isBusy ? styles.demoCardDisabled : null,
              ]}
            >
              <View style={styles.demoIconWrap}>
                <MaterialCommunityIcons
                  name="flask-outline"
                  size={18}
                  color="#111500"
                />
              </View>
              <View style={styles.demoCopy}>
                <Text style={styles.demoTitle}>Use Demo Activity</Text>
                <Text style={styles.demoSubtitle}>
                  No Strava account? Try the app with sample data.
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}

          {Platform.OS === 'ios' ? (
            <PrimaryButton
              label="Import from Health"
              icon="heart-pulse"
              onPress={handleHealthKitImport}
              variant="secondary"
              disabled={isBusy}
            />
          ) : null}
        </View>

        {shouldShowHealthSettings ? (
          <View style={styles.healthHelpWrap}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.healthHelpText}>
              Open Settings {'>'} Privacy & Security {'>'} Health app {'>'}{' '}
              PaceFrame and enable Workout + Workout Routes.
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.footerHint}>
        Your Strava login is used only to read activities.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: -4,
  },
  actions: {
    gap: spacing.sm,
  },
  demoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  demoCardPressed: {
    opacity: 0.88,
  },
  demoCardDisabled: {
    opacity: 0.6,
  },
  demoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoCopy: {
    flex: 1,
  },
  demoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  demoSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.35)',
    backgroundColor: 'rgba(127,29,29,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  errorText: {
    color: '#FCA5A5',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  healthHelpWrap: {
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  healthHelpText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  footerHint: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    marginTop: spacing.md,
  },
});
