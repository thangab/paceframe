import { useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '@/components/PrimaryButton';
import { spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { importActivitiesFromHealthKit } from '@/lib/healthkit';
import {
  getMockTokens,
  isMockStravaEnabled,
} from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  // Keep host as "app" for native deep link compatibility.
  const redirectUri = 'paceframe://app/oauth';

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
      await Linking.openURL(authUrl);
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
      <LinearGradient
        colors={[colors.background, colors.surfaceAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdrop}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.card}>
        <View style={styles.brandMark}>
          <MaterialCommunityIcons
            name="run-fast"
            size={26}
            color={colors.primaryText}
          />
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
              color={colors.danger}
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
            iconElement={
              <FontAwesome6
                name="strava"
                size={16}
                color={colors.primaryText}
              />
            }
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
                  color={colors.primaryText}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.lg,
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    glowTop: {
      position: 'absolute',
      top: -110,
      right: -60,
      width: 260,
      height: 260,
      borderRadius: 999,
      backgroundColor: `${colors.primary}24`,
    },
    glowBottom: {
      position: 'absolute',
      left: -80,
      bottom: -120,
      width: 260,
      height: 260,
      borderRadius: 999,
      backgroundColor: `${colors.accent}1F`,
    },
    card: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.lg + 2,
      gap: spacing.md,
      shadowColor: colors.text,
      shadowOpacity: 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    brandMark: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '900',
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
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.sm + 1,
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
      width: 36,
      height: 36,
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
      fontSize: 15,
      fontWeight: '800',
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
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerSurface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      gap: spacing.xs,
      alignItems: 'center',
    },
    errorText: {
      color: colors.dangerText,
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    healthHelpWrap: {
      gap: spacing.xs,
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      backgroundColor: colors.surface,
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
}
