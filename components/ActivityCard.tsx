import { useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StravaActivity } from '@/types/strava';
import { radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDistanceMeters, formatDuration, formatPace } from '@/lib/format';
import { generateMapSnapshot } from '@/lib/nativeMapSnapshot';
import { decodePolyline, encodePolyline } from '@/lib/polyline';
import { usePreferencesStore } from '@/store/preferencesStore';

type Props = {
  activity: StravaActivity;
  selected?: boolean;
  showStravaAttribution?: boolean;
  onPress: () => void;
};

const PACEFRAME_LOGO_GREY = require('../assets/logo/paceframe-grey.png');
const CARD_THUMB_SIZE = 88;
const MAP_TRACE_WIDTH = 0;
const MAP_SNAPSHOT_CACHE = new Map<string, string>();

export function ActivityCard({
  activity,
  selected,
  showStravaAttribution = false,
  onPress,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const distanceUnit = usePreferencesStore((s) => s.distanceUnit);
  const [mapSnapshotUri, setMapSnapshotUri] = useState<string | null>(null);
  const overlayOpacity = useRef(new Animated.Value(selected ? 0 : 1)).current;
  const logoOpacity = useRef(new Animated.Value(selected ? 0 : 0.5)).current;
  const mapSnapshotPolyline = useMemo(() => {
    const points = buildRoutePoints(activity);
    if (points.length < 2) return null;

    return encodePolyline(
      points.map((point) => ({ x: point.lng, y: point.lat })),
    );
  }, [activity]);

  useEffect(() => {
    let cancelled = false;

    async function loadMapSnapshot() {
      if (activity.photoUrl || !mapSnapshotPolyline || Platform.OS !== 'ios') {
        setMapSnapshotUri(null);
        return;
      }

      const cacheKey = `${mapSnapshotPolyline}:${colors.primary}`;
      const cachedUri = MAP_SNAPSHOT_CACHE.get(cacheKey);
      if (cachedUri) {
        setMapSnapshotUri(cachedUri);
        return;
      }

      try {
        const uri = await generateMapSnapshot({
          polyline: mapSnapshotPolyline,
          width: CARD_THUMB_SIZE,
          height: CARD_THUMB_SIZE,
          strokeColorHex: colors.primary,
          strokeWidth: MAP_TRACE_WIDTH,
          mapVariant: 'dark',
        });
        if (cancelled) return;
        MAP_SNAPSHOT_CACHE.set(cacheKey, uri);
        setMapSnapshotUri(uri);
      } catch {
        if (!cancelled) setMapSnapshotUri(null);
      }
    }

    void loadMapSnapshot();

    return () => {
      cancelled = true;
    };
  }, [activity.photoUrl, colors.primary, mapSnapshotPolyline]);

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
    formatDistanceMeters(activity.distance, distanceUnit),
  );
  const secondaryMetric = getSecondaryMetric(activity, distanceUnit);
  const timeText = formatDuration(activity.moving_time);
  const fallbackMetrics = getFallbackMetrics(activity, timeText);
  const whenText = formatWhen(activity.start_date);
  const deviceName = activity.device_name?.trim() || null;
  const icon = activityTypeIcon(activity.type);
  const detailedMetrics = shouldShowDetailedMetrics(activity.type);
  const stravaActivityUrl = `https://www.strava.com/activities/${activity.id}`;

  async function handleOpenStravaActivity() {
    try {
      await Linking.openURL(stravaActivityUrl);
    } catch {
      // Ignore open failures on card-level action.
    }
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
        ) : mapSnapshotUri ? (
          <View style={styles.thumbnailWrap}>
            <Image
              source={{ uri: mapSnapshotUri }}
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
          {showStravaAttribution && selected ? (
            <View style={styles.stravaRow}>
              <Pressable
                onPress={() => {
                  void handleOpenStravaActivity();
                }}
                style={({ pressed }) => [
                  styles.stravaLink,
                  pressed ? styles.stravaLinkPressed : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="View activity on Strava"
              >
                <Text style={styles.stravaLinkText}>View on Strava</Text>
                <MaterialCommunityIcons
                  name="open-in-new"
                  size={13}
                  color={colors.textSubtle}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function buildRoutePoints(
  activity: StravaActivity,
): { lat: number; lng: number }[] {
  const points = activity.map?.summary_polyline
    ? decodePolyline(activity.map.summary_polyline).map((p) => ({
        lat: p.y,
        lng: p.x,
      }))
    : [];

  const start = toLatLng(activity.start_latlng);
  const end = toLatLng(activity.end_latlng);

  if (points.length >= 2) {
    return fitRouteToKnownEndpoints(points, start, end);
  }
  if (start && end) return [start, end];
  return [];
}

function fitRouteToKnownEndpoints(
  points: { lat: number; lng: number }[],
  start: { lat: number; lng: number } | null,
  end: { lat: number; lng: number } | null,
) {
  if (!start || !end || points.length < 2) return points;

  const first = points[0];
  const last = points[points.length - 1];
  const sourceVecX = last.lng - first.lng;
  const sourceVecY = last.lat - first.lat;
  const targetVecX = end.lng - start.lng;
  const targetVecY = end.lat - start.lat;

  const sourceLen = Math.hypot(sourceVecX, sourceVecY);
  const targetLen = Math.hypot(targetVecX, targetVecY);
  if (sourceLen < 1e-7 || targetLen < 1e-7) {
    const translated = points.map((point) => ({
      lat: point.lat - first.lat + start.lat,
      lng: point.lng - first.lng + start.lng,
    }));
    translated[0] = start;
    translated[translated.length - 1] = end;
    return translated;
  }

  const sourceAngle = Math.atan2(sourceVecY, sourceVecX);
  const targetAngle = Math.atan2(targetVecY, targetVecX);
  const rotation = targetAngle - sourceAngle;
  const scale = targetLen / sourceLen;
  const cosTheta = Math.cos(rotation);
  const sinTheta = Math.sin(rotation);

  const transformed = points.map((point) => {
    const relX = point.lng - first.lng;
    const relY = point.lat - first.lat;
    const rotatedX = relX * cosTheta - relY * sinTheta;
    const rotatedY = relX * sinTheta + relY * cosTheta;
    return {
      lat: start.lat + rotatedY * scale,
      lng: start.lng + rotatedX * scale,
    };
  });

  transformed[0] = start;
  transformed[transformed.length - 1] = end;
  return transformed;
}

function toLatLng(
  pair: [number, number] | null | undefined,
): { lat: number; lng: number } | null {
  if (!pair || pair.length !== 2) return null;
  const lat = pair[0];
  const lng = pair[1];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
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

function getSecondaryMetric(
  activity: StravaActivity,
  distanceUnit: 'km' | 'mi',
) {
  if (isRideActivity(activity.type)) {
    const speed = activity.average_speed > 0 ? activity.average_speed * 3.6 : 0;
    const convertedSpeed = distanceUnit === 'mi' ? speed * 0.621371 : speed;
    const speedUnit = distanceUnit === 'mi' ? 'mph' : 'km/h';
    return {
      label: 'Avg Speed',
      value:
        convertedSpeed > 0
          ? `${convertedSpeed.toFixed(1)} ${speedUnit}`
          : `--.- ${speedUnit}`,
    };
  }

  if (isRunLikeActivity(activity.type)) {
    return {
      label: 'Pace',
      value: formatPace(activity.distance, activity.moving_time, distanceUnit),
    };
  }

  return {
    label: 'Pace',
    value: formatPace(activity.distance, activity.moving_time, distanceUnit),
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
      marginBottom: 4,
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
    stravaRow: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    stravaLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    stravaLinkPressed: {
      opacity: 0.75,
    },
    stravaLinkText: {
      color: colors.textSubtle,
      fontSize: 10,
      fontWeight: '400',
      textDecorationLine: 'underline',
    },
  });
}
