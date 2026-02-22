import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  fetchActivities,
  fetchActivityPhotoHighRes,
  fetchActivityStreams,
  refreshTokensWithSupabase,
} from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

let initialStravaLoadDone = false;
let initialStravaLoadInFlight: Promise<void> | null = null;

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
  const updateActivity = useActivityStore((s) => s.updateActivity);
  const selectActivity = useActivityStore((s) => s.selectActivity);
  const isHealthKitSource = source === 'healthkit';
  const refreshColor = themeMode === 'dark' ? colors.primary : colors.textMuted;
  const hasLoadedInitialStravaRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [hasFinishedInitialLoad, setHasFinishedInitialLoad] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getValidTokens = useCallback(async () => {
    if (!tokens?.accessToken) return null;

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

    return activeTokens;
  }, [login, tokens]);

  const loadActivities = useCallback(async (force = false) => {
    if (loading && !force) return;

    if (source === 'healthkit' && activities.length > 0) {
      return;
    }
    if (!force && source === 'strava') {
      if (activities.length > 0 || hasLoadedInitialStravaRef.current || initialStravaLoadDone) {
        return;
      }
      if (initialStravaLoadInFlight) {
        await initialStravaLoadInFlight;
        return;
      }
    }

    if (!tokens?.accessToken) {
      router.replace('/login');
      return;
    }

    const runLoad = async () => {
      try {
        setLoading(true);
        setError(null);
        const activeTokens = await getValidTokens();
        if (!activeTokens?.accessToken) {
          router.replace('/login');
          return;
        }

        const rows = await fetchActivities(activeTokens.accessToken);
        setActivities(rows, 'strava');
        hasLoadedInitialStravaRef.current = true;
        initialStravaLoadDone = true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load activities.',
        );
      } finally {
        setHasFinishedInitialLoad(true);
        setLoading(false);
      }
    };

    if (!force && source === 'strava') {
      initialStravaLoadInFlight = runLoad();
      try {
        await initialStravaLoadInFlight;
      } finally {
        initialStravaLoadInFlight = null;
      }
      return;
    }

    await runLoad();
  }, [source, activities.length, tokens, setActivities, getValidTokens, loading]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  async function handleLogout() {
    await logout();
    initialStravaLoadDone = false;
    initialStravaLoadInFlight = null;
    hasLoadedInitialStravaRef.current = false;
    clearActivities();
    router.replace('/login');
  }

  async function handleOpenPreview(
    target: '/preview' | '/preview?mode=templates',
  ) {
    if (!selectedActivityId) return;
    if (isHealthKitSource) {
      router.push(target);
      return;
    }

    try {
      setIsPreparingPreview(true);
      setError(null);
      const activeTokens = await getValidTokens();
      if (!activeTokens?.accessToken) {
        router.replace('/login');
        return;
      }

      const selected = activities.find(
        (item) => item.id === selectedActivityId,
      );
      const hasLoadedStreams =
        selected?.laps !== undefined && selected?.heartRateStream !== undefined;
      const hasHighResPhoto = Boolean(
        selected?.photoUrl && /\/(1024|2048)(?:\?|$)/.test(selected.photoUrl),
      );

      if (!hasLoadedStreams || !hasHighResPhoto) {
        const [streams, photoUrl] = await Promise.all([
          hasLoadedStreams
            ? Promise.resolve({
                laps: selected?.laps ?? [],
                heartRateStream: selected?.heartRateStream ?? [],
              })
            : fetchActivityStreams(
                activeTokens.accessToken,
                selectedActivityId,
              ),
          hasHighResPhoto
            ? Promise.resolve(selected?.photoUrl ?? null)
            : fetchActivityPhotoHighRes(
                activeTokens.accessToken,
                selectedActivityId,
              ),
        ]);
        updateActivity(selectedActivityId, {
          ...streams,
          ...(photoUrl ? { photoUrl } : {}),
        });
      }

      router.push(target);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not prepare activity data.',
      );
    } finally {
      setIsPreparingPreview(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          gestureEnabled: false,
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {(loading || !hasFinishedInitialLoad) && activities.length === 0 ? (
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
                onRefresh={() => {
                  void loadActivities(true);
                }}
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
              hasFinishedInitialLoad && !loading ? (
                <Text style={styles.empty}>No activities found.</Text>
              ) : null
            }
          />
        )}

        <View style={styles.bottomBar}>
          <Pressable
            style={[
              styles.templatesBtn,
              !selectedActivityId || isPreparingPreview
                ? styles.generateBtnDisabled
                : null,
            ]}
            onPress={() => {
              void handleOpenPreview('/preview?mode=templates');
            }}
            disabled={!selectedActivityId || isPreparingPreview}
          >
            <View style={styles.generateBtnContent}>
              <MaterialCommunityIcons
                name="view-dashboard-outline"
                size={17}
                color="#111500"
              />
              <Text style={styles.templatesBtnText}>Pick a Style</Text>
            </View>
          </Pressable>
          <Pressable
            style={[
              styles.generateBtn,
              !selectedActivityId || isPreparingPreview
                ? styles.generateBtnDisabled
                : null,
            ]}
            onPress={() => {
              void handleOpenPreview('/preview');
            }}
            disabled={!selectedActivityId || isPreparingPreview}
          >
            <View style={styles.generateBtnContent}>
              <MaterialCommunityIcons
                name="brush-variant"
                size={18}
                color="#E6EDF8"
              />
              <Text style={styles.generateBtnText}>Build Your Own</Text>
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    templatesBtn: {
      flex: 1,
      borderRadius: 20,
      backgroundColor: '#D4FF54',
      borderWidth: 1,
      borderColor: '#D4FF54',
      height: 62,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.text,
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    generateBtn: {
      flex: 1,
      borderRadius: 20,
      backgroundColor: '#131B2E',
      borderWidth: 1,
      borderColor: '#2E3A52',
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
      color: '#E6EDF8',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    templatesBtnText: {
      color: '#111500',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    generateBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
}
