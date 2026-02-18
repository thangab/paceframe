import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, Stack } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityCard } from '@/components/ActivityCard';
import { layout, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fetchActivities, refreshTokensWithSupabase } from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

export default function ActivitiesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const tokens = useAuthStore((s) => s.tokens);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const activities = useActivityStore((s) => s.activities);
  const source = useActivityStore((s) => s.source);
  const clearActivities = useActivityStore((s) => s.clearActivities);
  const selectedActivityId = useActivityStore((s) => s.selectedActivityId);
  const setActivities = useActivityStore((s) => s.setActivities);
  const selectActivity = useActivityStore((s) => s.selectActivity);
  const isHealthKitSource = source === 'healthkit';
  const refreshColor = themeMode === 'dark' ? colors.primary : colors.textMuted;
  const firstName = tokens?.athleteFirstName?.trim();
  const welcomeTitle = firstName ? `Welcome ${firstName} !` : 'Welcome !';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    if (source === 'healthkit' && activities.length > 0) {
      return;
    }

    if (!tokens?.accessToken) {
      router.replace('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let activeTokens = tokens;
      const nowSec = Math.floor(Date.now() / 1000);
      const refreshBufferSec = 120;
      const shouldRefresh =
        !tokens.accessToken.startsWith('mock-') &&
        Boolean(tokens.refreshToken) &&
        tokens.expiresAt <= nowSec + refreshBufferSec;

      if (shouldRefresh && tokens.refreshToken) {
        activeTokens = await refreshTokensWithSupabase({
          refreshToken: tokens.refreshToken,
        });
        await login(activeTokens);
      }

      const rows = await fetchActivities(activeTokens.accessToken);
      setActivities(rows, 'strava');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load activities.',
      );
    } finally {
      setLoading(false);
    }
  }, [source, activities.length, tokens, setActivities, login]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  async function handleLogout() {
    await logout();
    clearActivities();
    router.replace('/login');
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.navTitleWrap}>
              {isHealthKitSource ? (
                <MaterialCommunityIcons
                  name="heart-pulse"
                  size={18}
                  color={colors.text}
                />
              ) : (
                <FontAwesome6 name="strava" size={18} color={colors.text} />
              )}
              <Text style={styles.navTitleText}>Activities</Text>
            </View>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleLogout}
              style={styles.logoutBtn}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color={colors.text}
                style={{ transform: [{ scaleX: -1 }] }}
              />
            </Pressable>
          ),
          headerLeft: () => (
            <View style={styles.navAvatarContainer}>
              <View style={styles.navAvatarWrap}>
                {tokens?.athleteProfileUrl ? (
                  <Image
                    source={{ uri: tokens.athleteProfileUrl }}
                    style={styles.navAvatar}
                  />
                ) : (
                  <View style={styles.navAvatarFallback}>
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={16}
                      color={colors.textSubtle}
                    />
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => {
                  void setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
                }}
                style={styles.themeToggleBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  themeMode === 'dark'
                    ? 'Switch to light theme'
                    : 'Switch to dark theme'
                }
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={[colors.glassSurfaceStart, colors.glassSurfaceEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.themeToggleGlassBg}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.08)']}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.themeToggleGlassSheen}
                />
                <MaterialCommunityIcons
                  name={
                    themeMode === 'dark' ? 'weather-sunny' : 'weather-night'
                  }
                  size={16}
                  color={colors.text}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.background, colors.surfaceAlt, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sportBg}
        />
        <View pointerEvents="none" style={styles.trackLinesWrap}>
          <View style={[styles.trackLine, styles.trackLineOne]} />
          <View style={[styles.trackLine, styles.trackLineTwo]} />
          <View style={[styles.trackLine, styles.trackLineThree]} />
        </View>
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbBottom} />

        <View style={styles.heroCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{welcomeTitle}</Text>
              <Text style={styles.subtitle}>
                Pick one activity to start your design
              </Text>
            </View>
            <View style={styles.sourcePill}>
              <MaterialCommunityIcons
                name={isHealthKitSource ? 'heart-pulse' : 'fire'}
                size={13}
                color={colors.text}
              />
              <Text style={styles.sourcePillText}>
                {isHealthKitSource ? 'Health' : 'Strava'}
              </Text>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && activities.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadActivities}
                tintColor={refreshColor}
                colors={[refreshColor]}
                progressBackgroundColor={colors.surface}
              />
            }
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                selected={selectedActivityId === item.id}
                onPress={() => selectActivity(item.id)}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No run activities found.</Text>
            }
          />
        )}

        <View style={styles.bottomBar}>
          <Pressable
            style={[
              styles.generateBtn,
              !selectedActivityId ? styles.generateBtnDisabled : null,
            ]}
            onPress={() => router.push('/preview')}
            disabled={!selectedActivityId}
          >
            <View style={styles.generateBtnContent}>
              <Text style={styles.generateBtnText}>Make it pop</Text>
              <MaterialCommunityIcons
                name="star-four-points-outline"
                size={18}
                color={colors.primaryText}
              />
            </View>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.background,
    },
    sportBg: {
      ...StyleSheet.absoluteFillObject,
    },
    trackLinesWrap: {
      ...StyleSheet.absoluteFillObject,
      transform: [{ rotate: '-12deg' }],
      opacity: 0.4,
    },
    trackLine: {
      position: 'absolute',
      left: -120,
      right: -120,
      height: 2,
      backgroundColor: colors.borderStrong,
    },
    trackLineOne: {
      top: 116,
    },
    trackLineTwo: {
      top: 174,
      opacity: 0.72,
    },
    trackLineThree: {
      top: 232,
      opacity: 0.5,
    },
    bgOrbTop: {
      position: 'absolute',
      top: -110,
      right: -90,
      width: 260,
      height: 260,
      borderRadius: 999,
      backgroundColor: `${colors.primary}2A`,
    },
    bgOrbBottom: {
      position: 'absolute',
      bottom: 120,
      left: -90,
      width: 220,
      height: 220,
      borderRadius: 999,
      backgroundColor: `${colors.accent}22`,
    },
    heroCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md - 2,
      marginBottom: spacing.md,
      shadowColor: colors.text,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 7 },
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    navAvatarWrap: {
      width: 32,
      height: 32,
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    navAvatarContainer: {
      marginLeft: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    themeToggleBtn: {
      width: 34,
      height: 34,
      aspectRatio: 1,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.glassStroke,
      backgroundColor: 'transparent',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
    },
    themeToggleGlassBg: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 17,
    },
    themeToggleGlassSheen: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 17,
    },
    navAvatar: {
      width: '100%',
      height: '100%',
    },
    navAvatarFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    navTitleText: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'left',
      lineHeight: 34,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    sourcePill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    sourcePillText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    logoutBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    error: {
      color: colors.danger,
      marginBottom: spacing.sm,
    },
    empty: {
      marginTop: spacing.lg,
      color: colors.textMuted,
      textAlign: 'center',
      fontWeight: '600',
    },
    listContent: {
      paddingBottom: 124,
    },
    bottomBar: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: layout.floatingBottomOffset,
    },
    generateBtn: {
      borderRadius: 20,
      backgroundColor: colors.primary,
      height: 62,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.text,
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    generateBtnDisabled: {
      opacity: 0.5,
    },
    generateBtnText: {
      color: colors.primaryText,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    generateBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
}
