import { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StravaActivity } from '@/types/strava';
import { radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDistanceMeters, formatDuration, formatPace } from '@/lib/format';

type Props = {
  activity: StravaActivity;
  selected?: boolean;
  onPress: () => void;
};

const PACEFRAME_LOGO_GREY = require('../assets/logo/paceframe-grey.png');

export function ActivityCard({ activity, selected, onPress }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const overlayOpacity = useRef(new Animated.Value(selected ? 0 : 1)).current;
  const logoOpacity = useRef(new Animated.Value(selected ? 0 : 0.5)).current;

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: selected ? 0 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    Animated.timing(logoOpacity, {
      toValue: selected ? 0 : 0.5,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [logoOpacity, overlayOpacity, selected]);

  const distanceText = normalizeDistance(
    formatDistanceMeters(activity.distance),
  );
  const secondaryMetric = getSecondaryMetric(activity);
  const timeText = formatDuration(activity.moving_time);
  const fallbackMetrics = getFallbackMetrics(activity, timeText);
  const whenText = formatWhen(activity.start_date);
  const deviceName = activity.device_name?.trim() || null;
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
          <View style={styles.thumbnailWrap}>
            <Image
              source={{ uri: activity.photoUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.thumbnailOverlay, { opacity: overlayOpacity }]}
            />
            <Animated.Image
              source={PACEFRAME_LOGO_GREY}
              style={[styles.thumbnailWatermark, { opacity: logoOpacity }]}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={[styles.thumbnailWrap, styles.thumbnailPlaceholder]}>
            <Image
              source={PACEFRAME_LOGO_GREY}
              style={styles.thumbnailLogo}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
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
          <View style={styles.dateBlock}>
            <View style={styles.dateMetaRow}>
              <MaterialCommunityIcons
                name={icon}
                size={14}
                color={colors.primaryOnLight}
                style={styles.dateIcon}
              />
              <View style={styles.dateTextBlock}>
                <Text style={styles.date}>{whenText}</Text>
                {deviceName ? (
                  <Text style={styles.deviceName} numberOfLines={1}>
                    {deviceName}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
          {detailedMetrics ? (
            <View style={styles.metrics}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metric}>{distanceText}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{secondaryMetric.label}</Text>
                <Text style={styles.metric}>{secondaryMetric.value}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Time</Text>
                <Text style={styles.metric}>{timeText}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.metricsSingle}>
              {fallbackMetrics.map((item) => (
                <View
                  key={item.label}
                  style={[styles.metricCard, styles.metricCardSingle]}
                >
                  <Text style={styles.metricLabel}>{item.label}</Text>
                  <Text style={styles.metricSingle}>{item.value}</Text>
                </View>
              ))}
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
  if (isRideActivity(activity.type)) {
    const kmh = activity.average_speed > 0 ? activity.average_speed * 3.6 : 0;
    return {
      label: 'Avg Speed',
      value: kmh > 0 ? `${kmh.toFixed(1)} km/h` : '--.- km/h',
    };
  }

  if (isRunLikeActivity(activity.type)) {
    return {
      label: 'Pace',
      value: formatPace(activity.distance, activity.moving_time),
    };
  }

  return {
    label: 'Pace',
    value: formatPace(activity.distance, activity.moving_time),
  };
}

function isRunLikeActivity(type: string) {
  const normalized = (type || '').toLowerCase();
  return normalized === 'run' || normalized === 'walk' || normalized === 'hike';
}

function isRideActivity(type: string) {
  return (type || '').toLowerCase() === 'ride';
}

function getFallbackMetrics(activity: StravaActivity, timeText: string) {
  const metrics: { label: string; value: string }[] = [
    { label: 'Time', value: timeText },
  ];

  if (
    typeof activity.average_heartrate === 'number' &&
    activity.average_heartrate > 0
  ) {
    metrics.push({
      label: 'Avg HR',
      value: `${Math.round(activity.average_heartrate)} bpm`,
    });
  }

  if (typeof activity.calories === 'number' && activity.calories > 0) {
    metrics.push({
      label: 'Cal',
      value: `${Math.round(activity.calories)} kcal`,
    });
  }

  return metrics;
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
  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (dayDiff === 0) return `Today at ${timeLabel}`;
  if (dayDiff === 1) return `Yesterday at ${timeLabel}`;

  const dateLabel = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${dateLabel} at ${timeLabel}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
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
    thumbnailWrap: {
      width: 88,
      height: 88,
      borderRadius: radius.sm,
      overflow: 'hidden',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    thumbnailPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.42)',
    },
    thumbnailWatermark: {
      position: 'absolute',
      width: 34,
      height: 34,
    },
    thumbnailLogo: {
      width: 30,
      height: 30,
      opacity: 0.4,
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
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '400',
    },
    dateMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    dateBlock: {
      marginBottom: 8,
    },
    dateIcon: {
      marginTop: 0,
    },
    dateTextBlock: {
      flex: 1,
      gap: 1,
    },
    deviceName: {
      color: colors.textSubtle,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '400',
    },
    metricLabel: {
      color: colors.textSubtle,
      fontSize: 11,
      fontWeight: '400',
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
      paddingVertical: 2,
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
