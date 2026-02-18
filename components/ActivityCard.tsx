import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StravaActivity } from '@/types/strava';
import { radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            {renderActivityIcon(30, colors.textSubtle)}
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            {renderActivityIcon(16, colors.primaryOnLight)}
            <Text style={styles.title} numberOfLines={1}>
              {activity.name}
            </Text>
            <View
              style={[
                styles.selectionPill,
                selected && styles.selectionPillActive,
              ]}
            >
              <MaterialCommunityIcons
                name={selected ? 'check' : 'plus'}
                size={12}
                color={selected ? colors.primaryText : colors.textSubtle}
              />
            </View>
          </View>
          <Text style={styles.date}>{whenText}</Text>
          {detailedMetrics ? (
            <View style={styles.metrics}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>DISTANCE</Text>
                <Text style={styles.metric}>{distanceText}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{secondaryMetric.label}</Text>
                <Text style={styles.metric}>{secondaryMetric.value}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TIME</Text>
                <Text style={styles.metric}>{timeText}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.metricsSingle}>
              <View style={[styles.metricCard, styles.metricCardSingle]}>
                <Text style={styles.metricLabel}>TIME</Text>
                <Text style={styles.metricSingle}>{timeText}</Text>
              </View>
            </View>
          )}
        </View>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg + 4,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm + 4,
      marginBottom: spacing.sm + 4,
      shadowColor: colors.text,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    selected: {
      borderColor: colors.primaryBorderOnLight,
      shadowColor: colors.primary,
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    pressed: {
      opacity: 0.95,
      transform: [{ scale: 0.995 }],
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm + 2,
      alignItems: 'center',
    },
    thumbnail: {
      width: 88,
      height: 88,
      borderRadius: radius.md + 4,
      backgroundColor: colors.surfaceAlt,
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
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    date: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
      marginBottom: 8,
    },
    metricLabel: {
      color: colors.textSubtle,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    metrics: {
      flexDirection: 'row',
      gap: 6,
    },
    metricsSingle: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 7,
      gap: 3,
    },
    metricCardSingle: {
      minWidth: 94,
      flex: 0,
    },
    metric: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 14,
    },
    metricSingle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 14,
    },
    selectionPill: {
      marginLeft: 'auto',
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectionPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primaryBorderOnLight,
    },
  });
}
