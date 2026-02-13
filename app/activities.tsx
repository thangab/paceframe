import { useCallback, useEffect, useState } from 'react';
import { router, Stack } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityCard } from '@/components/ActivityCard';
import { spacing } from '@/constants/theme';
import { fetchActivities } from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';

export default function ActivitiesScreen() {
  const tokens = useAuthStore((s) => s.tokens);
  const logout = useAuthStore((s) => s.logout);
  const activities = useActivityStore((s) => s.activities);
  const source = useActivityStore((s) => s.source);
  const clearActivities = useActivityStore((s) => s.clearActivities);
  const selectedActivityId = useActivityStore((s) => s.selectedActivityId);
  const setActivities = useActivityStore((s) => s.setActivities);
  const selectActivity = useActivityStore((s) => s.selectActivity);

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
      const rows = await fetchActivities(tokens.accessToken);
      setActivities(rows, 'strava');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load activities.',
      );
    } finally {
      setLoading(false);
    }
  }, [source, activities.length, tokens?.accessToken, setActivities]);

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
        }}
      />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}
          </Text>
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
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 30 / 1.5,
    fontWeight: '800',
    color: '#D2D8E6',
    letterSpacing: 0.8,
    textAlign: 'center',
    width: '100%',
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
