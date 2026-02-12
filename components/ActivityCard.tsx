import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { StravaActivity } from '@/types/strava';
import { colors, radius, spacing } from '@/constants/theme';
import { formatDate, formatDistanceMeters, formatDuration, formatPace } from '@/lib/format';

type Props = {
  activity: StravaActivity;
  selected?: boolean;
  onPress: () => void;
};

export function ActivityCard({ activity, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {activity.photoUrl ? (
          <Image source={{ uri: activity.photoUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Text style={styles.placeholderText}>Run</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{activity.name}</Text>
          <Text style={styles.date}>{formatDate(activity.start_date)}</Text>
          <View style={styles.metrics}>
            <Text style={styles.metric}>{formatDistanceMeters(activity.distance)}</Text>
            <Text style={styles.metric}>{formatDuration(activity.moving_time)}</Text>
            <Text style={styles.metric}>{formatPace(activity.distance, activity.moving_time)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: '#D1D5DB',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  date: {
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    color: colors.text,
    fontWeight: '600',
  },
});
