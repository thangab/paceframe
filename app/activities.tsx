import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
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
import { PrimaryButton } from '@/components/PrimaryButton';
import { createThemeModeOptions } from '@/components/preview/panel/data';
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
import { usePreferencesStore } from '@/store/preferencesStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useThemeStore } from '@/store/themeStore';

let initialStravaLoadDone = false;
let initialStravaLoadInFlight: Promise<void> | null = null;

export default function ActivitiesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isCompactViewport = screenHeight < 740 || screenWidth < 390;
  const floatingBottomOffset = isCompactViewport
    ? 5
    : layout.floatingBottomOffset;
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const distanceUnit = usePreferencesStore((s) => s.distanceUnit);
  const elevationUnit = usePreferencesStore((s) => s.elevationUnit);
  const setDistanceUnit = usePreferencesStore((s) => s.setDistanceUnit);
  const setElevationUnit = usePreferencesStore((s) => s.setElevationUnit);
  const tokens = useAuthStore((s) => s.tokens);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const activities = useActivityStore((s) => s.activities);
  const source = useActivityStore((s) => s.source);
  const clearActivities = useActivityStore((s) => s.clearActivities);
  const selectedActivityId = useActivityStore((s) => s.selectedActivityId);
  const setActivities = useActivityStore((s) => s.setActivities);
  const updateActivity = useActivityStore((s) => s.updateActivity);
  const selectActivity = useActivityStore((s) => s.selectActivity);
  const isHealthKitSource = source === 'healthkit';
  const refreshColor = themeMode === 'dark' ? colors.primary : colors.textMuted;
  const hasLiveStravaSource =
    source === 'strava' &&
    Boolean(tokens?.accessToken) &&
    !(tokens?.accessToken?.startsWith('mock-') ?? false);
  const hasLoadedInitialStravaRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [hasFinishedInitialLoad, setHasFinishedInitialLoad] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [appCacheUsageLabel, setAppCacheUsageLabel] = useState('Cache: --');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      if (loading && !force) return;

      if (source === 'healthkit' && activities.length > 0) {
        return;
      }
      if (!force && source === 'strava') {
        if (
          activities.length > 0 ||
          hasLoadedInitialStravaRef.current ||
          initialStravaLoadDone
        ) {
          return;
        }
        if (initialStravaLoadInFlight) {
          await initialStravaLoadInFlight;
          return;
        }
      }

      if (!tokens?.accessToken) {
        resetAndReplace('/login');
        return;
      }

      const runLoad = async () => {
        try {
          setLoading(true);
          setError(null);
          const activeTokens = await getValidTokens();
          if (!activeTokens?.accessToken) {
            resetAndReplace('/login');
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
    },
    [
      source,
      activities.length,
      tokens,
      setActivities,
      getValidTokens,
      loading,
      resetAndReplace,
    ],
  );

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  async function handleLogout() {
    setIsProfileMenuOpen(false);
    await logout();
    initialStravaLoadDone = false;
    initialStravaLoadInFlight = null;
    hasLoadedInitialStravaRef.current = false;
    clearActivities();
    resetAndReplace('/login');
  }

  const directorySizeBytes = useCallback(
    async (dirUri: string): Promise<number> => {
      try {
        const entries = await FileSystem.readDirectoryAsync(dirUri);
        let total = 0;
        for (const name of entries) {
          const child = `${dirUri}${name}`;
          const info = await FileSystem.getInfoAsync(child);
          if (!info.exists) continue;
          if (info.isDirectory) {
            total += await directorySizeBytes(`${child}/`);
          } else if (typeof info.size === 'number') {
            total += info.size;
          }
        }
        return total;
      } catch {
        return 0;
      }
    },
    [],
  );

  const refreshAppCacheUsage = useCallback(async () => {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      setAppCacheUsageLabel('Cache: unavailable');
      return;
    }

    const bytes = await directorySizeBytes(cacheDir);
    const mb = bytes / (1024 * 1024);
    setAppCacheUsageLabel(`Cache: ${mb.toFixed(mb >= 100 ? 0 : 1)} MB`);
  }, [directorySizeBytes]);

  async function clearDirectory(dirUri: string) {
    const entries = await FileSystem.readDirectoryAsync(dirUri);
    for (const name of entries) {
      const child = `${dirUri}${name}`;
      const info = await FileSystem.getInfoAsync(child);
      if (!info.exists) continue;
      if (info.isDirectory) {
        await clearDirectory(`${child}/`);
      }
      await FileSystem.deleteAsync(child, { idempotent: true });
    }
  }

  async function clearAppCache() {
    if (isClearingCache) return;
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      setSettingsMessage('Cache unavailable.');
      return;
    }

    try {
      setIsClearingCache(true);
      setSettingsMessage('Clearing cache...');
      await clearDirectory(cacheDir);
      await refreshAppCacheUsage();
      setSettingsMessage('Cache cleared.');
    } catch (err) {
      setSettingsMessage(
        err instanceof Error
          ? `Could not clear cache (${err.message}).`
          : 'Could not clear cache.',
      );
    } finally {
      setIsClearingCache(false);
    }
  }

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    void refreshAppCacheUsage();
  }, [isProfileMenuOpen, refreshAppCacheUsage]);

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
                onPress={() => setIsProfileMenuOpen(true)}
                style={({ pressed }) => [
                  styles.avatarTrigger,
                  pressed ? styles.avatarTriggerPressed : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open profile menu"
              >
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
      <Modal
        visible={isProfileMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileMenuOpen(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setIsProfileMenuOpen(false)}
        >
          <Pressable style={styles.profileMenu} onPress={() => {}}>
            <Text style={styles.profileMenuTitle}>Settings</Text>
            <Text style={styles.menuSectionLabel}>Theme</Text>
            <View style={styles.menuChipsRow}>
              {createThemeModeOptions().map((item) => {
                const selected = item.id === themeMode;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void setThemeMode(item.id);
                    }}
                    style={[
                      styles.menuChip,
                      selected ? styles.menuChipSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.menuChipText,
                        selected ? styles.menuChipTextSelected : null,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.menuSectionLabel}>Units</Text>
            <View style={styles.menuChipsRow}>
              {[
                { id: 'metric', label: 'Metric' },
                { id: 'imperial', label: 'Imperial' },
              ].map((item) => {
                const selected =
                  item.id === 'metric'
                    ? distanceUnit === 'km' && elevationUnit === 'm'
                    : distanceUnit === 'mi' && elevationUnit === 'ft';
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (item.id === 'metric') {
                        void Promise.all([
                          setDistanceUnit('km'),
                          setElevationUnit('m'),
                        ]);
                        return;
                      }
                      void Promise.all([
                        setDistanceUnit('mi'),
                        setElevationUnit('ft'),
                      ]);
                    }}
                    style={[
                      styles.menuChip,
                      selected ? styles.menuChipSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.menuChipText,
                        selected ? styles.menuChipTextSelected : null,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.menuNote}>{appCacheUsageLabel}</Text>
            {settingsMessage ? (
              <Text style={styles.menuNote}>{settingsMessage}</Text>
            ) : null}
            <View style={styles.menuButtonWrap}>
              <PrimaryButton
                label="Clear cache"
                icon="broom"
                onPress={() => {
                  void clearAppCache();
                }}
                disabled={isClearingCache}
                variant="secondary"
                colorScheme="panel"
                compact
              />
            </View>
            {!isPremium ? (
              <View style={styles.menuButtonWrap}>
                <PrimaryButton
                  label="Unlock Premium Layouts"
                  onPress={() => {
                    setIsProfileMenuOpen(false);
                    router.push('/paywall');
                  }}
                  variant="secondary"
                  compact
                />
              </View>
            ) : null}
            <Pressable
              onPress={handleLogout}
              style={[styles.menuItem, styles.menuLogoutButton]}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <MaterialCommunityIcons
                name="logout"
                size={18}
                color={colors.danger}
                style={{ transform: [{ scaleX: -1 }] }}
              />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    menuOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(4, 9, 19, 0.35)',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    profileMenu: {
      marginTop: 98,
      marginLeft: 14,
      width: 280,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 8,
      shadowColor: colors.text,
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    profileMenuTitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
      paddingHorizontal: 8,
      paddingBottom: 6,
      textTransform: 'uppercase',
    },
    menuSectionLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      paddingHorizontal: 8,
      paddingTop: 4,
      paddingBottom: 6,
    },
    menuChipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 8,
      paddingBottom: 6,
    },
    menuChip: {
      flex: 1,
      minHeight: 34,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    menuChipSelected: {
      borderColor: colors.primaryBorderOnLight,
      backgroundColor: `${colors.primary}22`,
    },
    menuChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    menuChipTextSelected: {
      color: colors.text,
    },
    menuNote: {
      color: colors.textMuted,
      fontSize: 12,
      paddingHorizontal: 8,
      paddingTop: 2,
      paddingBottom: 6,
    },
    menuButtonWrap: {
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    menuItem: {
      minHeight: 40,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    menuLogoutButton: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: `${colors.danger}55`,
      backgroundColor: `${colors.danger}14`,
      justifyContent: 'center',
    },
    menuItemText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    logoutText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '700',
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
