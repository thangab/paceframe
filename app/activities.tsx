import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ActivityCard } from '@/components/ActivityCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing } from '@/constants/theme';
import { fetchActivities } from '@/lib/strava';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';

export default function ActivitiesScreen() {
  const tokens = useAuthStore((s) => s.tokens);
  const logout = useAuthStore((s) => s.logout);
  const activities = useActivityStore((s) => s.activities);
  const selectedActivityId = useActivityStore((s) => s.selectedActivityId);
  const setActivities = useActivityStore((s) => s.setActivities);
  const selectActivity = useActivityStore((s) => s.selectActivity);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    if (!tokens?.accessToken) {
      router.replace('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const rows = await fetchActivities(tokens.accessToken);
      setActivities(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activities.');
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken, setActivities]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Runs</Text>
        <PrimaryButton label="Logout" onPress={handleLogout} variant="secondary" />
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
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadActivities} />}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              selected={selectedActivityId === item.id}
              onPress={() => selectActivity(item.id)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No run activities found.</Text>}
        />
      )}

      <PrimaryButton
        label="Preview Image"
        onPress={() => router.push('/preview')}
        disabled={!selectedActivityId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
  },
  empty: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
