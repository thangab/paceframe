import { useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginHeroCarousel from '@/components/login/LoginHeroCarousel';
import { spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  buildGarminOAuthStartUrl,
} from '@/lib/garminOAuth';
import { importActivitiesFromHealthKit } from '@/lib/healthkit';
import { getMockTokens } from '@/lib/strava';
import { buildStravaMobileAuthorizeUrl } from '@/lib/stravaOAuth';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';

const STRAVA_BUTTON_ORANGE = require('../assets/strava/btn-strava-orange.png');
const GARMIN_TAG_BLACK = require('../assets/garmin/garmin-tag-black.png');

const HERO_TEMPLATE_SOURCES = [
  require('../assets/login/template1.jpg'),
  require('../assets/login/template2.jpg'),
  require('../assets/login/template3.jpg'),
  require('../assets/login/template4.jpg'),
  require('../assets/login/template5.jpg'),
  require('../assets/login/template6.jpg'),
];

export default function LoginScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim();
  const login = useAuthStore((s) => s.login);
  const [isBusy, setIsBusy] = useState(false);
  const setActivities = useActivityStore((s) => s.setActivities);

  function resetAndReplace(path: '/activities' | '/login') {
    router.replace(path);
  }

  function showError(message: string) {
    if (
      Platform.OS === 'ios' &&
      /(healthkit|authorization|denied|permission)/i.test(message)
    ) {
      Alert.alert(
        'Apple Health',
        `${message}\n\nOpen Settings > Privacy & Security > Health > PaceFrame and turn on Workout and Workout Routes.`,
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }

    Alert.alert('Login error', message);
  }

  async function handleLogin() {
    try {
      setIsBusy(true);

      if (!clientId) {
        throw new Error('Strava client ID is not configured.');
      }

      const authUrl = buildStravaMobileAuthorizeUrl({ clientId });
      await Linking.openURL(authUrl);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMockLogin() {
    try {
      setIsBusy(true);
      await login(getMockTokens());
      resetAndReplace('/activities');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Mock login failed.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGarminLogin() {
    try {
      setIsBusy(true);
      const { authUrl } = await buildGarminOAuthStartUrl();
      await Linking.openURL(authUrl);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Garmin login failed.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleHealthKitImport() {
    if (Platform.OS !== 'ios') return;

    try {
      setIsBusy(true);
      const activities = await importActivitiesFromHealthKit();
      if (activities.length === 0) {
        showError('No HealthKit workouts found.');
        return;
      }
      setActivities(activities, 'healthkit');
      try {
        await login(getMockTokens());
      } catch {
        // Keep Health import non-blocking if auth setup is unavailable.
      }
      resetAndReplace('/activities');
    } catch (err) {
      showError(
        err instanceof Error ? err.message : 'HealthKit import failed.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function openLegalDocument(url: string) {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      await Linking.openURL(url);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#131B2E', '#141E2C', '#0E1523']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View
        style={[styles.topSection, { paddingTop: insets.top + spacing.xs }]}
      >
        <LoginHeroCarousel images={HERO_TEMPLATE_SOURCES} />
      </View>

      <View
        style={[
          styles.bottomSheet,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <Text style={styles.title}>PaceFrame</Text>
        <Text style={styles.subtitle}>
          Connect activities and generate amazing cards to share in seconds.
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={handleGarminLogin}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Connect with Garmin"
            style={({ pressed }) => [
              styles.garminButton,
              pressed && !isBusy ? styles.pressed : null,
              isBusy ? styles.disabled : null,
            ]}
          >
            <Text style={styles.garminButtonText}>Connect with</Text>
            <Image
              source={GARMIN_TAG_BLACK}
              resizeMode="contain"
              style={styles.garminTagImage}
            />
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Connect with Strava"
            style={({ pressed }) => [
              styles.stravaButton,
              pressed && !isBusy ? styles.pressed : null,
              isBusy ? styles.disabled : null,
            ]}
          >
            <Image
              source={STRAVA_BUTTON_ORANGE}
              resizeMode="contain"
              style={styles.stravaButtonImage}
            />
          </Pressable>

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

          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={handleHealthKitImport}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.healthButton,
                pressed && !isBusy ? styles.pressed : null,
                isBusy ? styles.disabled : null,
              ]}
            >
              <MaterialCommunityIcons
                name="heart"
                size={20}
                color={colors.danger}
              />
              <Text style={styles.healthLinkText}>
                Import from Apple Health
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.legal}>
          Your Strava login is used only to read activities. By continuing, you
          accept our{' '}
          <Text
            style={styles.legalLink}
            onPress={() => {
              void openLegalDocument('https://paceframe.app/terms');
            }}
          >
            Terms
          </Text>{' '}
          and{' '}
          <Text
            style={styles.legalLink}
            onPress={() => {
              void openLegalDocument('https://paceframe.app/privacy-policy');
            }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#131B2E',
    },
    topSection: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    bottomSheet: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      marginTop: -8,
      backgroundColor: '#131B2E',
    },
    title: {
      color: colors.primary,
      fontSize: 46,
      lineHeight: 50,
      fontWeight: '800',
      letterSpacing: 0.5,
      marginTop: -16,
      alignSelf: 'center',
      fontFamily: 'system',
    },
    subtitle: {
      color: 'rgba(243,246,255,0.78)',
      fontSize: 15,
      lineHeight: 21,
      marginBottom: spacing.sm - 2,
      alignSelf: 'center',
    },
    actions: {
      gap: spacing.sm,
    },
    stravaButton: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    stravaButtonImage: {
      width: '100%',
      height: 56,
    },
    garminButton: {
      width: '72%',
      margin: 'auto',
      borderRadius: 8,
      backgroundColor: colors.solidBlack,
      height: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
    },
    garminButtonText: {
      color: colors.solidWhite,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    garminTagImage: {
      height: 48,
      width: 120,
      margin: 0,
      padding: 0,
    },
    demoCard: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.sm + 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      width: '72%',
      margin: 'auto',
    },
    demoCardPressed: {
      opacity: 0.88,
    },
    demoCardDisabled: {
      opacity: 0.6,
    },
    demoIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 5,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    demoCopy: {
      flex: 1,
    },
    demoTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    demoSubtitle: {
      color: colors.textMuted,
      fontSize: 9,
      lineHeight: 13,
      marginTop: 1,
    },
    healthButton: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.solidWhite,
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.md + 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      width: '72%',
      margin: 'auto',
      justifyContent: 'center',
    },
    healthLinkText: {
      color: colors.solidBlack,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '500',
    },
    legal: {
      marginTop: spacing.sm,
      textAlign: 'center',
      color: 'rgba(242,245,255,0.64)',
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: spacing.sm,
    },
    legalLink: {
      color: 'rgba(242,245,255,0.9)',
      textDecorationLine: 'underline',
    },
    pressed: {
      opacity: 0.9,
    },
    disabled: {
      opacity: 0.65,
    },
  });
}
