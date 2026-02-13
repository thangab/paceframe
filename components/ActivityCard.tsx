import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StravaActivity } from '@/types/strava';
import {
  formatDate,
  formatDistanceMeters,
  formatDuration,
  formatPace,
} from '@/lib/format';

type Props = {
  activity: StravaActivity;
  selected?: boolean;
  onPress: () => void;
};

export function ActivityCard({ activity, selected, onPress }: Props) {
  const distanceText = normalizeDistance(
    formatDistanceMeters(activity.distance),
  );
  const secondaryMetric = getSecondaryMetric(activity);
  const timeText = formatDuration(activity.moving_time);
  const whenText = formatWhen(activity.start_date);
  const icon = activityTypeIcon(activity.type);
  const detailedMetrics = shouldShowDetailedMetrics(activity.type);

  function renderActivityIcon(size: number, color: string) {
    return <MaterialCommunityIcons name={icon} size={size} color={color} />;
  }

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
            {renderActivityIcon(30, '#A7B0C0')}
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            {renderActivityIcon(16, '#D4FF54')}
            <Text style={styles.title} numberOfLines={1}>
              {activity.name}
            </Text>
          </View>
          <Text style={styles.date}>{whenText}</Text>
          {detailedMetrics ? (
            <>
              <View style={styles.metricLabels}>
                <Text style={styles.metricLabel}>DISTANCE</Text>
                <Text style={styles.metricLabel}>{secondaryMetric.label}</Text>
                <Text style={styles.metricLabel}>TIME</Text>
              </View>
              <View style={styles.metrics}>
                <Text style={styles.metric}>{distanceText}</Text>
                <Text style={styles.metric}>{secondaryMetric.value}</Text>
                <Text style={styles.metric}>{timeText}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.metricLabels}>
                <Text style={styles.metricLabel}>TIME</Text>
              </View>
              <View style={styles.metricsSingle}>
                <Text style={styles.metricSingle}>{timeText}</Text>
              </View>
            </>
          )}
        </View>

        {selected ? (
          <View style={styles.selectedBadge}>
            <MaterialCommunityIcons name="check" size={16} color="#111500" />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function normalizeDistance(distance: string) {
  // 12.40 km -> 12.4 km, 12.00 km -> 12 km
  return distance
    .replace(/(\d+)\.(\d*?[1-9])0+\s/, '$1.$2 ')
    .replace(/\.0+\s/, ' ');
}

function activityTypeIcon(
  type: string,
): keyof typeof MaterialCommunityIcons.glyphMap {
  if (type === 'Run') return 'run-fast';
  if (type === 'Ride') return 'bike';
  if (type === 'Walk') return 'walk';
  if (type === 'Hike') return 'hiking';
  if (type === 'Swim') return 'swim';
  if (type === 'Rowing') return 'rowing';
  if (type === 'Elliptical' || type === 'WeightTraining') return 'dumbbell';
  if (type === 'Stair') return 'stairs';
  if (type === 'Strength') return 'arm-flex';
  if (type === 'HIIT') return 'flash';
  if (type === 'Yoga') return 'yoga';
  if (type === 'Workout') return 'medal-outline';
  return 'dumbbell';
}

function getSecondaryMetric(activity: StravaActivity) {
  if (isRunLikeActivity(activity.type)) {
    return {
      label: 'PACE',
      value: formatPace(activity.distance, activity.moving_time),
    };
  }

  const kmh = activity.average_speed > 0 ? activity.average_speed * 3.6 : 0;
  return {
    label: 'SPEED',
    value: kmh > 0 ? `${kmh.toFixed(1)} km/h` : '--.- km/h',
  };
}

function isRunLikeActivity(type: string) {
  const normalized = (type || '').toLowerCase();
  return normalized === 'run' || normalized === 'walk' || normalized === 'hike';
}

function shouldShowDetailedMetrics(type: string) {
  const normalized = (type || '').toLowerCase();
  return (
    normalized === 'run' ||
    normalized === 'walk' ||
    normalized === 'hike' ||
    normalized === 'ride'
  );
}

function formatWhen(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  let dayLabel = formatDate(isoDate).toUpperCase();
  if (dayDiff === 0) dayLabel = 'TODAY';
  if (dayDiff === 1) dayLabel = 'YESTERDAY';

  const timeLabel = date
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toUpperCase();
  return `${dayLabel} • ${timeLabel}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#13161E',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 14,
  },
  selected: {
    borderColor: 'rgba(212,255,84,0.7)',
  },
  pressed: {
    opacity: 0.94,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 94,
    height: 94,
    borderRadius: 22,
    backgroundColor: '#1E2430',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#F4F6FB',
    fontSize: 20,
    fontWeight: '800',
  },
  date: {
    color: '#9AA3B4',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 14,
  },
  metricLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricLabel: {
    flex: 1,
    color: '#7E8697',
    fontSize: 12,
    fontWeight: '700',
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricsSingle: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  metric: {
    flex: 1,
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 36 / 2,
  },
  metricSingle: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 36 / 2,
  },
  selectedBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4FF54',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
