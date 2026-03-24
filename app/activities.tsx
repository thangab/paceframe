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
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityCard } from '@/components/ActivityCard';
import { layout, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  getInitialStravaLoadDone,
  getInitialStravaLoadInFlight,
  setInitialStravaLoadDone,
  setInitialStravaLoadInFlight,
} from '@/lib/activityLoadState';
import { fetchGarminActivities } from '@/lib/garmin';
import {
  fetchActivities,
  fetchActivityPhotoHighRes,
  fetchActivityStreams,
  refreshTokensWithSupabase,
} from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

export default function ActivitiesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isCompactViewport = screenHeight < 740 || screenWidth < 390;
  const floatingBottomOffset = isCompactViewport
    ? 5
    : layout.floatingBottomOffset;
  const themeMode = useThemeStore((s) => s.mode);
  const tokens = useAuthStore((s) => s.tokens);
  const activeProvider = useAuthStore((s) => s.activeProvider);
  const connections = useAuthStore((s) => s.connections);
  const login = useAuthStore((s) => s.login);
  const activities = useActivityStore((s) => s.activities);
  const source = useActivityStore((s) => s.source);
  const clearActivities = useActivityStore((s) => s.clearActivities);
  const activeSource =
    source === 'healthkit'
      ? 'healthkit'
      : activeProvider === 'garmin'
      ? 'garmin'
      : 'strava';
  const selectedActivityId = useActivityStore((s) => s.selectedActivityId);
  const setActivities = useActivityStore((s) => s.setActivities);
  const updateActivity = useActivityStore((s) => s.updateActivity);
  const selectActivity = useActivityStore((s) => s.selectActivity);
  const isHealthKitSource = activeSource === 'healthkit';
  const isNonStravaSource = activeSource !== 'strava';
  const refreshColor = themeMode === 'dark' ? colors.primary : colors.textMuted;
  const hasLiveStravaSource =
    activeSource === 'strava' &&
    Boolean(tokens?.accessToken) &&
    !(tokens?.accessToken?.startsWith('mock-') ?? false);
  const athleteProfileUrl =
    connections.strava?.athleteProfileUrl ?? tokens?.athleteProfileUrl ?? null;
  const hasLoadedInitialStravaRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [hasFinishedInitialLoad, setHasFinishedInitialLoad] = useState(false);
  const previousSourceRef = useRef<string | null>(null);
  const previousAuthRef = useRef<string | null>(null);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const authSession = `${activeProvider ?? 'none'}::${connections.garmin?.garminUserId ?? 'none'}::${connections.strava?.athleteId ?? 'none'}::${connections.mock?.athleteId ?? 'none'}`;
    if (previousAuthRef.current && previousAuthRef.current !== authSession) {
      setHasFinishedInitialLoad(false);
      hasLoadedInitialStravaRef.current = false;
      setInitialStravaLoadDone(false);
      if (activeSource === 'garmin') {
        clearActivities();
      }
    }
    if (
      previousSourceRef.current &&
      previousSourceRef.current !== activeSource
    ) {
      setHasFinishedInitialLoad(false);
      if (activeSource !== 'strava') {
        hasLoadedInitialStravaRef.current = false;
      }
      setInitialStravaLoadDone(false);
    }
    previousAuthRef.current = authSession;
    previousSourceRef.current = activeSource;
  }, [
    activeSource,
    activeProvider,
    clearActivities,
    connections.garmin?.garminUserId,
    connections.mock?.athleteId,
    connections.strava?.athleteId,
  ]);

  const resetAndReplace = useCallback((path: '/login' | '/activities') => {
    if (router.canGoBack()) {
      router.dismissAll();
    }
    router.replace(path);
  }, []);

  const getValidTokens = useCallback(async () => {
    if (!tokens?.accessToken) return null;

    let activeTokens = tokens;
    const nowSec = Math.floor(Date.now() / 1000);
    const refreshBufferSec = 120;
    const shouldRefresh =
      tokens.provider !== 'garmin' &&
      !tokens.accessToken.startsWith('mock-') &&
      Boolean(tokens.refreshToken) &&
      tokens.expiresAt <= nowSec + refreshBufferSec;

    if (shouldRefresh && tokens.refreshToken) {
      activeTokens = await refreshTokensWithSupabase({
        refreshToken: tokens.refreshToken,
      });
      await login(activeTokens);
    }
    console.log('[Activities] getValidTokens', {
      provider: activeTokens.provider,
      hasToken: Boolean(activeTokens.accessToken),
      garminUserId: activeTokens.garminUserId ?? null,
      expiresAt: activeTokens.expiresAt,
    });

    return activeTokens;
  }, [login, tokens]);

  const loadActivities = useCallback(
    async (force = false) => {
      if (loading && !force) return;
      console.log('[Activities] loadActivities entry', {
        activeSource,
        force,
        hasFinishedInitialLoad,
        loading,
        activitiesLength: activities.length,
      });

      if (activeSource === 'healthkit' && activities.length > 0) {
        console.log('[Activities] load skipped', {
          reason: 'healthkitHasData',
          activitiesLength: activities.length,
        });
        return;
      }
      if (!force && activeSource !== 'strava' && hasFinishedInitialLoad) {
        console.log('[Activities] load skipped', {
          reason: 'nonStravaFinished',
          activeSource,
          hasFinishedInitialLoad,
        });
        return;
      }
      if (!force && activeSource === 'strava') {
        if (
          activities.length > 0 ||
          hasLoadedInitialStravaRef.current ||
          getInitialStravaLoadDone()
        ) {
          console.log('[Activities] load skipped', {
            reason: 'stravaAlreadyLoaded',
            activitiesLength: activities.length,
            hasLoadedInitialStravaRef: hasLoadedInitialStravaRef.current,
            initialStravaLoadDone: getInitialStravaLoadDone(),
          });
          return;
        }
        const initialStravaLoadInFlight = getInitialStravaLoadInFlight();
        if (initialStravaLoadInFlight) {
          console.log('[Activities] load skipped', {
            reason: 'stravaLoadInFlight',
          });
          await initialStravaLoadInFlight;
          return;
        }
      }

      if (!tokens?.accessToken && activeSource !== 'healthkit') {
        console.log('[Activities] load skipped', {
          reason: 'missingAccessToken',
        });
        resetAndReplace('/login');
        return;
      }

      const runLoad = async () => {
        try {
          setLoading(true);
          setError(null);
          console.log('[Activities] Loading activities', {
            activeSource,
            hasToken: Boolean(tokens?.accessToken),
            provider: tokens?.provider,
          });
          const activeTokens = await getValidTokens();
          if (!activeTokens?.accessToken) {
            console.warn('[Activities] No active tokens after refresh');
            resetAndReplace('/login');
            return;
          }

          if (activeSource === 'garmin') {
            console.log('[Garmin][Activities] prepare fetchGarminActivities', {
              hasToken: Boolean(activeTokens.accessToken),
              garminUserId: activeTokens.garminUserId ?? null,
              refreshInFlight: Boolean(getInitialStravaLoadInFlight()),
            });
            console.log(
              '[Garmin][Activities] Fetching Garmin activities...',
              activeTokens,
            );
            const rows = await fetchGarminActivities(
              activeTokens.accessToken,
              activeTokens.garminUserId ?? undefined,
            );
            console.log('[Garmin][Activities] Garmin activities fetched', {
              count: rows.length,
            });
            setActivities(rows, 'garmin');
            console.log('[Garmin][Activities] setActivities called', {
              hasRows: rows.length > 0,
            });
            return;
          }

          console.log('[Strava][Activities] Fetching Strava activities...');
          const rows = await fetchActivities(activeTokens.accessToken);
          console.log('[Strava][Activities] Strava activities fetched', {
            count: rows.length,
          });
          setActivities(rows, 'strava');
          hasLoadedInitialStravaRef.current = true;
          setInitialStravaLoadDone(true);
        } catch (err) {
          console.error('[Activities] Load failed', err);
          setError(
            err instanceof Error ? err.message : 'Could not load activities.',
          );
        } finally {
          setHasFinishedInitialLoad(true);
          setLoading(false);
        }
      };

      if (!force && activeSource === 'strava') {
        setInitialStravaLoadInFlight(runLoad());
        try {
          const initialStravaLoadInFlight = getInitialStravaLoadInFlight();
          await initialStravaLoadInFlight;
        } finally {
          setInitialStravaLoadInFlight(null);
        }
        return;
      }

      await runLoad();
    },
    [
      activeSource,
      activities.length,
      tokens,
      setActivities,
      getValidTokens,
      hasFinishedInitialLoad,
      loading,
      resetAndReplace,
    ],
  );

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  async function handleOpenPreview(
    target: '/preview' | '/preview?mode=templates',
  ) {
    if (!selectedActivityId) return;
    if (isNonStravaSource) {
      router.push(target);
      return;
    }

    try {
      setIsPreparingPreview(true);
      setError(null);
      const activeTokens = await getValidTokens();
      if (!activeTokens?.accessToken) {
        resetAndReplace('/login');
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
              ) : null}
              <Text style={styles.navTitleText}>Activities</Text>
            </View>
          ),
          headerLeft: () => (
            <View style={styles.navAvatarContainer}>
              <Pressable
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [
                  styles.avatarTrigger,
                  pressed ? styles.avatarTriggerPressed : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <View style={styles.navAvatarWrap}>
                  {athleteProfileUrl ? (
                    <Image
                      source={{ uri: athleteProfileUrl }}
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
                <View pointerEvents="none" style={styles.avatarSettingsBadge}>
                  <MaterialCommunityIcons
                    name="cog"
                    size={10}
                    color={colors.primaryText}
                  />
                </View>
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
                showStravaAttribution={hasLiveStravaSource}
                onPress={() => selectActivity(item.id)}
              />
            )}
            ListFooterComponent={
              hasLiveStravaSource ? (
                <View style={styles.listFooterAttribution}>
                  <Text style={styles.listFooterAttributionText}>
                    Powered by Strava
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              hasFinishedInitialLoad && !loading ? (
                <Text style={styles.empty}>No activities found.</Text>
              ) : null
            }
          />
        )}

        <View style={[styles.bottomBar, { bottom: floatingBottomOffset }]}>
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
      marginLeft: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarTrigger: {
      borderRadius: 999,
      position: 'relative',
    },
    avatarTriggerPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.96 }],
    },
    avatarSettingsBadge: {
      position: 'absolute',
      right: -3,
      bottom: -3,
      width: 15,
      height: 15,
      borderRadius: 999,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: 124,
    },
    listFooterAttribution: {
      alignItems: 'center',
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    listFooterAttributionText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '400',
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
