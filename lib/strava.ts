import {
  AuthTokens,
  StravaActivity,
  StravaHeartRatePoint,
  StravaLap,
} from '@/types/strava';
import { mockActivities } from '@/lib/mockData';

const STRAVA_BASE = 'https://www.strava.com/api/v3';
const USE_MOCK_STRAVA = process.env.EXPO_PUBLIC_USE_MOCK_STRAVA === 'true';

export type ExchangeCodeParams = {
  code: string;
  redirectUri: string;
};

type RefreshTokensParams = {
  refreshToken: string;
};

export async function exchangeCodeWithSupabase({
  code,
  redirectUri,
}: ExchangeCodeParams): Promise<AuthTokens> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/strava-exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ code, redirectUri }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to exchange auth code.');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: data.athlete?.id,
    athleteFirstName: data.athlete?.firstname ?? null,
    athleteProfileUrl:
      data.athlete?.profile_medium ?? data.athlete?.profile ?? null,
  };
}

export async function refreshTokensWithSupabase({
  refreshToken,
}: RefreshTokensParams): Promise<AuthTokens> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/strava-refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to refresh Strava tokens.');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: data.athlete?.id,
    athleteFirstName: data.athlete?.firstname ?? null,
    athleteProfileUrl:
      data.athlete?.profile_medium ?? data.athlete?.profile ?? null,
  };
}

export async function fetchActivities(
  accessToken: string,
): Promise<StravaActivity[]> {
  if (USE_MOCK_STRAVA || accessToken.startsWith('mock-')) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return mockActivities;
  }

  const response = await fetch(`${STRAVA_BASE}/athlete/activities?per_page=5`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to fetch activities.');
  }

  const activities = (await response.json()) as StravaActivity[];
  const activitiesWithPhotos = await Promise.all(
    activities.map(async (activity) => {
      const details = await fetchActivityDetails(accessToken, activity.id);
      return {
        ...activity,
        calories:
          typeof details.calories === 'number'
            ? details.calories
            : activity.calories,
        photoUrl: details.photoUrl ?? extractActivityPhotoUrl(activity),
      };
    }),
  );

  return activitiesWithPhotos;
}

export async function fetchActivityStreams(
  accessToken: string,
  activityId: number,
): Promise<Pick<StravaActivity, 'laps' | 'heartRateStream'>> {
  const [laps, heartRateStream] = await Promise.all([
    fetchActivityLaps(accessToken, activityId),
    fetchActivityHeartRateStream(accessToken, activityId),
  ]);

  return { laps, heartRateStream };
}

export async function fetchActivityPhotoHighRes(
  accessToken: string,
  activityId: number,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${STRAVA_BASE}/activities/${activityId}/photos?size=2048`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) return null;
    const photos = (await response.json()) as {
      urls?: Record<string, string>;
    }[];
    const first = photos[0];
    if (!first?.urls) return null;

    const directBest =
      first.urls['2048'] ?? first.urls['1024'] ?? first.urls['600'];
    if (directBest) return directBest;

    const numericBest = Object.entries(first.urls)
      .filter(([key, value]) => Number.isFinite(Number(key)) && Boolean(value))
      .sort((a, b) => Number(b[0]) - Number(a[0]))[0]?.[1];
    if (numericBest) return numericBest;

    return (
      first.urls['100'] ??
      Object.values(first.urls).find((value) => typeof value === 'string') ??
      null
    );
  } catch {
    return null;
  }
}

export type LapPaceChartPoint = {
  lapLabel: string;
  paceSecPerKm: number;
  paceText: string;
  distanceMeters: number;
  movingTimeSec: number;
  averageHeartrate: number | null;
};

export type HeartRateAreaChartPoint = {
  timeSec: number;
  timeLabel: string;
  bpm: number;
};

export function buildLapPaceChartData(
  activity: Pick<StravaActivity, 'laps'> | null | undefined,
): LapPaceChartPoint[] {
  if (!activity?.laps?.length) return [];

  return activity.laps
    .map((lap, index) => {
      const paceSecPerKm = computePaceSecPerKm(lap.distance, lap.moving_time);
      if (!paceSecPerKm) return null;

      return {
        lapLabel: `Lap ${index + 1}`,
        paceSecPerKm,
        paceText: formatPaceSecPerKm(paceSecPerKm),
        distanceMeters: lap.distance,
        movingTimeSec: lap.moving_time,
        averageHeartrate:
          typeof lap.average_heartrate === 'number'
            ? Math.round(lap.average_heartrate)
            : null,
      };
    })
    .filter((item): item is LapPaceChartPoint => Boolean(item));
}

export function buildHeartRateAreaChartData(
  activity: Pick<StravaActivity, 'heartRateStream'> | null | undefined,
): HeartRateAreaChartPoint[] {
  if (!activity?.heartRateStream?.length) return [];

  return activity.heartRateStream.map((point) => ({
    timeSec: point.seconds,
    timeLabel: formatClock(point.seconds),
    bpm: point.bpm,
  }));
}

export function isMockStravaEnabled() {
  return USE_MOCK_STRAVA;
}

export function getMockTokens(): AuthTokens {
  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    athleteId: 999999,
    athleteFirstName: 'Runner',
  };
}

function extractActivityPhotoUrl(activity: StravaActivity): string | null {
  const urls = activity.photos?.primary?.urls;
  if (!urls) return null;

  const directBest = urls['2048'] ?? urls['1024'] ?? urls['600'];
  if (directBest) return directBest;

  const numericBest = Object.entries(urls)
    .filter(([key, value]) => Number.isFinite(Number(key)) && Boolean(value))
    .sort((a, b) => Number(b[0]) - Number(a[0]))[0]?.[1];
  if (numericBest) return numericBest;

  return (
    urls['100'] ??
    Object.values(urls).find((value) => typeof value === 'string') ??
    null
  );
}

async function fetchActivityDetails(
  accessToken: string,
  activityId: number,
): Promise<Pick<StravaActivity, 'calories' | 'photoUrl'>> {
  try {
    const response = await fetch(`${STRAVA_BASE}/activities/${activityId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return { calories: null, photoUrl: null };
    const details = (await response.json()) as StravaActivity;
    return {
      calories:
        typeof details.calories === 'number' ? details.calories : null,
      photoUrl: extractActivityPhotoUrl(details),
    };
  } catch {
    return { calories: null, photoUrl: null };
  }
}

async function fetchActivityLaps(
  accessToken: string,
  activityId: number,
): Promise<StravaLap[]> {
  try {
    const response = await fetch(
      `${STRAVA_BASE}/activities/${activityId}/laps`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) return [];
    const laps = (await response.json()) as {
      id?: number;
      name?: string | null;
      distance?: number;
      moving_time?: number;
      elapsed_time?: number;
      average_speed?: number | null;
      average_heartrate?: number | null;
      max_heartrate?: number | null;
      lap_index?: number;
      split?: number;
    }[];

    const normalized: StravaLap[] = [];
    laps.forEach((lap, index) => {
      const distance = lap.distance ?? 0;
      const moving_time = lap.moving_time ?? 0;
      const elapsed_time = lap.elapsed_time ?? moving_time;
      if (distance <= 0 || moving_time <= 0) return;

      normalized.push({
        id: lap.id,
        name: lap.name ?? null,
        lap_index:
          typeof lap.lap_index === 'number'
            ? lap.lap_index
            : typeof lap.split === 'number'
              ? lap.split
              : index + 1,
        distance,
        moving_time,
        elapsed_time,
        average_speed:
          typeof lap.average_speed === 'number' ? lap.average_speed : null,
        average_heartrate:
          typeof lap.average_heartrate === 'number'
            ? lap.average_heartrate
            : null,
        max_heartrate:
          typeof lap.max_heartrate === 'number' ? lap.max_heartrate : null,
      });
    });

    return normalized;
  } catch {
    return [];
  }
}

async function fetchActivityHeartRateStream(
  accessToken: string,
  activityId: number,
): Promise<StravaHeartRatePoint[]> {
  try {
    const response = await fetch(
      `${STRAVA_BASE}/activities/${activityId}/streams?keys=time,heartrate&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) return [];

    const streams = (await response.json()) as {
      time?: { data?: number[] };
      heartrate?: { data?: number[] };
    };

    const time = streams.time?.data ?? [];
    const heartrate = streams.heartrate?.data ?? [];
    const pointsCount = Math.min(time.length, heartrate.length);

    if (!pointsCount) return [];

    const points: StravaHeartRatePoint[] = [];
    for (let i = 0; i < pointsCount; i += 1) {
      const seconds = time[i];
      const bpm = heartrate[i];
      if (
        typeof seconds !== 'number' ||
        !Number.isFinite(seconds) ||
        typeof bpm !== 'number' ||
        !Number.isFinite(bpm)
      ) {
        continue;
      }
      points.push({
        seconds: Math.max(0, Math.round(seconds)),
        bpm: Math.round(bpm),
      });
    }

    return points;
  } catch {
    return [];
  }
}

function computePaceSecPerKm(
  distanceMeters: number,
  movingTimeSec: number,
): number | null {
  if (distanceMeters <= 0 || movingTimeSec <= 0) return null;
  return movingTimeSec / (distanceMeters / 1000);
}

function formatPaceSecPerKm(paceSecPerKm: number): string {
  const total = Math.max(0, Math.round(paceSecPerKm));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

function formatClock(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
