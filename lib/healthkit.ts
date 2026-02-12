import { NativeModules, Platform } from 'react-native';
import { mockActivities } from '@/lib/mockData';
import { StravaActivity } from '@/types/strava';

type NativeHealthActivity = {
  id?: number | string;
  name?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  type?: string;
  start_date?: string;
  average_speed?: number;
  summary_polyline?: string | null;
};

type HealthKitModule = {
  getRecentActivities?: () => Promise<NativeHealthActivity[]>;
};

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStravaActivity(
  item: NativeHealthActivity,
  index: number,
): StravaActivity {
  const idBase = asNumber(item.id, Date.now() + index);
  const movingTime = asNumber(item.moving_time, 0);
  const elapsedTime = asNumber(item.elapsed_time, movingTime);
  const type = item.type || 'Run';
  const distance = asNumber(item.distance, 0);
  const averageSpeed =
    item.average_speed != null
      ? asNumber(item.average_speed, 0)
      : movingTime > 0
        ? distance / movingTime
        : 0;

  return {
    id: Math.round(idBase),
    name: item.name || 'HealthKit Workout',
    distance,
    moving_time: movingTime,
    elapsed_time: elapsedTime,
    total_elevation_gain: asNumber(item.total_elevation_gain, 0),
    type,
    start_date: item.start_date || new Date().toISOString(),
    average_speed: averageSpeed,
    map: {
      summary_polyline: item.summary_polyline ?? null,
    },
    photoUrl: null,
  };
}

function hasRoute(activity: StravaActivity) {
  return Boolean(activity.map.summary_polyline);
}

export async function importActivitiesFromHealthKit(): Promise<StravaActivity[]> {
  if (Platform.OS !== 'ios') {
    throw new Error('HealthKit import is available on iOS only.');
  }

  const module = NativeModules.PaceFrameHealthKit as HealthKitModule | undefined;
  if (module?.getRecentActivities) {
    const rows = await module.getRecentActivities();
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    const activities = rows
      .map(toStravaActivity)
      .sort((a, b) => {
        const aRoute = hasRoute(a) ? 1 : 0;
        const bRoute = hasRoute(b) ? 1 : 0;
        if (aRoute !== bRoute) return bRoute - aRoute;
        return (
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );
      });

    return activities;
  }

  // Fallback to demo data when native HealthKit bridge is not wired yet.
  return mockActivities.map((item, i) => ({
    ...item,
    id: item.id + 900000 + i,
    name: `${item.name} (HealthKit)`,
  }));
}
