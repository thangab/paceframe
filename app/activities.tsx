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
import { ActivityCard } from '@/components/ActivityCard';
import { spacing, type ThemeColors } from '@/constants/theme';
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
                <MaterialCommunityIcons
                  name={themeMode === 'dark' ? 'weather-sunny' : 'weather-night'}
                  size={16}
                  color={colors.text}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{welcomeTitle}</Text>
          <View style={styles.headerAvatarSpacer} />
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
              <RefreshControl refreshing={loading} onRefresh={loadActivities} />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  headerAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarSpacer: {
    width: 36,
    height: 36,
  },
  navAvatarWrap: {
    width: 30,
    height: 30,
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
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    fontWeight: '700',
    color: colors.text,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    color: colors.textMuted,
    fontWeight: '800',
    fontSize: 13,
    backgroundColor: colors.surfaceStrong,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  },
  listContent: {
    paddingBottom: 120,
  },
  bottomBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  generateBtn: {
    borderRadius: 18,
    backgroundColor: colors.primary,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: colors.primaryText,
    fontSize: 18,
    fontWeight: '800',
  },
    generateBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
}
