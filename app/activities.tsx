import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
import { mockActivities } from '@/lib/mockData';
import {
  fetchActivityFromSupabase,
  fetchActivitiesFromSupabase,
  refreshTokensWithSupabase,
  syncStravaActivityDetailsWithSupabase,
} from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

export default function ActivitiesScreen() {
  const { syncStatus: rawSyncStatus } = useLocalSearchParams<{
    syncStatus?: string | string[];
  }>();
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
      : activeProvider === 'mock'
      ? 'mock'
      : activeProvider === 'garmin'
      ? 'garmin'
      : 'strava';
  const selectedActivityId = useActivityStore((s) => s.selectedActivityId);
  const selectedActivity = useActivityStore((s) => s.selectedActivity());
  const setActivities = useActivityStore((s) => s.setActivities);
  const selectActivity = useActivityStore((s) => s.selectActivity);
  const updateActivity = useActivityStore((s) => s.updateActivity);
  const isHealthKitSource = activeSource === 'healthkit';
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
  const loadingRef = useRef(false);
  const hasFinishedInitialLoadRef = useRef(false);
  const activitiesLengthRef = useRef(0);
  const previousSourceRef = useRef<string | null>(null);
  const previousAuthRef = useRef<string | null>(null);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [preparingPreviewMessage, setPreparingPreviewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const syncStatus = Array.isArray(rawSyncStatus)
    ? rawSyncStatus[0]
    : rawSyncStatus;
  const [garminSyncPending, setGarminSyncPending] = useState(
    syncStatus === 'garmin-pending',
  );
  const isStravaSyncPending =
    activeSource === 'strava' &&
    syncStatus === 'strava-pending' &&
    activities.length === 0;
  const showGarminSyncPending =
    activeSource === 'garmin' && garminSyncPending;
  const pendingEmptyStateMessage = isStravaSyncPending
    ? 'Strava connected, activity sync in progress...'
    : showGarminSyncPending
      ? 'Garmin connected, activity import in progress...'
      : null;
  const pendingLoaderColor = pendingEmptyStateMessage
    ? colors.textMuted
    : colors.primary;

  useEffect(() => {
    setGarminSyncPending(syncStatus === 'garmin-pending');
  }, [syncStatus]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasFinishedInitialLoadRef.current = hasFinishedInitialLoad;
  }, [hasFinishedInitialLoad]);

  useEffect(() => {
    activitiesLengthRef.current = activities.length;
  }, [activities.length]);

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
    return activeTokens;
  }, [login, tokens]);

  const loadActivities = useCallback(
    async (force = false) => {
      if (loadingRef.current) return;

      if (activeSource === 'healthkit' && activitiesLengthRef.current > 0) {
        return;
      }
      if (
        !force &&
        activeSource !== 'strava' &&
        hasFinishedInitialLoadRef.current
      ) {
        return;
      }
      if (!force && activeSource === 'strava') {
        if (
          activitiesLengthRef.current > 0 ||
          hasLoadedInitialStravaRef.current ||
          getInitialStravaLoadDone()
        ) {
          return;
        }
        const initialStravaLoadInFlight = getInitialStravaLoadInFlight();
        if (initialStravaLoadInFlight) {
          await initialStravaLoadInFlight;
          return;
        }
      }

      if (!tokens?.accessToken && activeSource !== 'healthkit') {
        resetAndReplace('/login');
        return;
      }

      const runLoad = async () => {
        try {
          setLoading(true);
          setError(null);
          const activeTokens = await getValidTokens();
          if (!activeTokens?.accessToken) {
            console.warn('[Activities] No active tokens after refresh');
            resetAndReplace('/login');
            return;
          }

          if (activeSource === 'mock') {
            setActivities(mockActivities, 'strava');
            return;
          }

          if (activeSource === 'garmin') {
            const rows = await fetchGarminActivities(
              activeTokens.accessToken,
              activeTokens.garminUserId ?? undefined,
            );
            setActivities(rows, 'garmin');
            return;
          }

          const stravaAthleteId =
            activeTokens.athleteId ?? connections.strava?.athleteId ?? null;
          if (!stravaAthleteId) {
            throw new Error('Missing Strava athlete ID.');
          }

          const rows = await fetchActivitiesFromSupabase(stravaAthleteId);
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
      connections.strava?.athleteId,
      tokens,
      setActivities,
      getValidTokens,
      resetAndReplace,
    ],
  );

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    if (!showGarminSyncPending) return;

    let cancelled = false;
    let previousCount = -1;
    let stableCount = 0;
    const startedAt = Date.now();
    const timeoutMs = 60_000;
    const intervalMs = 3_000;

    void (async () => {
      while (!cancelled && Date.now() - startedAt < timeoutMs) {
        await loadActivities(true);
        if (cancelled) return;

        const currentCount = useActivityStore.getState().activities.length;
        if (currentCount > 0 && currentCount === previousCount) {
          stableCount += 1;
        } else {
          stableCount = 0;
        }
        previousCount = currentCount;

        if (currentCount > 0 && stableCount >= 2) {
          setGarminSyncPending(false);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      if (!cancelled) {
        setGarminSyncPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadActivities, showGarminSyncPending]);

  async function handleOpenPreview(
    target: '/preview' | '/preview?mode=templates',
  ) {
    if (!selectedActivityId) return;
    const shouldSyncStravaDetails =
      activeSource === 'strava' && !selectedActivity?.detailsFetchedAt;

    setIsPreparingPreview(true);
    setError(null);
    setPreparingPreviewMessage(
      shouldSyncStravaDetails
        ? 'Syncing Strava details...'
        : 'Preparing preview...',
    );
    try {
      if (shouldSyncStravaDetails) {
        const activeTokens = await getValidTokens();
        const stravaAthleteId =
          activeTokens?.athleteId ?? connections.strava?.athleteId ?? null;
        if (!stravaAthleteId) {
          throw new Error('Missing Strava athlete ID.');
        }

        await syncStravaActivityDetailsWithSupabase({
          athleteId: stravaAthleteId,
          activityId: selectedActivityId,
        });

        const freshActivity = await fetchActivityFromSupabase(
          stravaAthleteId,
          selectedActivityId,
        );
        if (freshActivity) {
          updateActivity(selectedActivityId, freshActivity);
        }
      }

      router.push(target);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not prepare preview.',
      );
    } finally {
      setIsPreparingPreview(false);
      setPreparingPreviewMessage('');
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
        {(loading || !hasFinishedInitialLoad || Boolean(pendingEmptyStateMessage)) &&
        activities.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={pendingLoaderColor} />
            {pendingEmptyStateMessage ? (
              <Text style={styles.pendingSyncText}>
                {pendingEmptyStateMessage}
              </Text>
            ) : null}
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
              {isPreparingPreview ? (
                <ActivityIndicator size="small" color="#111500" />
              ) : (
                <MaterialCommunityIcons
                  name="view-dashboard-outline"
                  size={17}
                  color="#111500"
                />
              )}
              <Text style={styles.templatesBtnText}>
                {isPreparingPreview ? 'Preparing...' : 'Pick a Style'}
              </Text>
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
              {isPreparingPreview ? (
                <ActivityIndicator size="small" color="#E6EDF8" />
              ) : (
                <MaterialCommunityIcons
                  name="brush-variant"
                  size={18}
                  color="#E6EDF8"
                />
              )}
              <Text style={styles.generateBtnText}>
                {isPreparingPreview ? 'Preparing...' : 'Build Your Own'}
              </Text>
            </View>
          </Pressable>
        </View>
        {isPreparingPreview ? (
          <View
            style={[
              styles.preparingPreviewBadge,
              { bottom: floatingBottomOffset + 76 },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.preparingPreviewText}>
              {preparingPreviewMessage}
            </Text>
          </View>
        ) : null}
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
      gap: spacing.sm,
    },
    pendingSyncText: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
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
    preparingPreviewBadge: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      shadowColor: colors.text,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    preparingPreviewText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
