import { useCallback, useEffect, useState } from 'react';
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
import { spacing } from '@/constants/theme';
import { fetchActivities, refreshTokensWithSupabase } from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';

export default function ActivitiesScreen() {
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
                  color="#131313"
                />
              ) : (
                <FontAwesome6 name="strava" size={18} color="#131313" />
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
                color="#131313"
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
                      color="#A0A8B8"
                    />
                  </View>
                )}
              </View>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Select an activity</Text>
          <View style={styles.headerAvatarSpacer} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && activities.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#D4FF54" />
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
                color="#111500"
              />
            </View>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#06080D',
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
    borderColor: '#2A2E38',
    backgroundColor: '#161B25',
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
    borderColor: '#2A2E38',
    backgroundColor: '#161B25',
  },
  navAvatarContainer: {
    marginLeft: 12,
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
    fontWeight: '600',
    color: '#131313',
  },
  title: {
    fontSize: 30 / 1.5,
    fontWeight: '800',
    color: '#D2D8E6',
    letterSpacing: 0.8,
    textAlign: 'center',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    color: '#C9D0DE',
    fontWeight: '800',
    fontSize: 13,
    backgroundColor: '#2A2E38',
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
    color: '#F87171',
    marginBottom: spacing.sm,
  },
  empty: {
    marginTop: spacing.lg,
    color: '#8A93A5',
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
    borderRadius: 20,
    backgroundColor: '#D4FF54',
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: '#111500',
    fontSize: 38 / 2,
    fontWeight: '900',
  },
  generateBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
