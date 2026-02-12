import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
            <Text style={styles.placeholderText}>{icon}</Text>
          </View>
        )}
        <View style={styles.thumbBadge}>
          <Text style={styles.thumbBadgeText}>{icon}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {activity.name} {icon}
          </Text>
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
            <Text style={styles.selectedBadgeText}>✓</Text>
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

function activityTypeIcon(type: string) {
  if (type === 'Run') return '🏃';
  if (type === 'Ride') return '🚴';
  if (type === 'Hike' || type === 'Walk') return '🥾';
  return '';
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
  placeholderText: {
    color: '#A7B0C0',
    fontWeight: '700',
    fontSize: 28,
  },
  thumbBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 30,
    height: 30,
    borderRadius: 16,
    backgroundColor: '#D4FF54',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  thumbBadgeText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingTop: 2,
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
  selectedBadgeText: {
    color: '#111500',
    fontWeight: '900',
    fontSize: 16,
  },
});
