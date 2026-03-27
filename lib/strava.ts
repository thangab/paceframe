import {
  AuthTokens,
  StravaActivity,
  StravaHeartRatePoint,
  StravaLap,
} from '@/types/strava';
import { supabase } from '@/lib/supabaseClient';

const STRAVA_ACTIVITIES_TABLE = 'strava_activities';
const STRAVA_SYNC_URL =
  process.env.EXPO_PUBLIC_STRAVA_SYNC_URL?.trim() ||
  'https://paceframe.app/api/strava/sync';

export type ExchangeCodeParams = {
  code: string;
  redirectUri: string;
};

type RefreshTokensParams = {
  refreshToken: string;
};

type SyncStravaActivitiesParams = {
  athleteId: number;
  limit?: number;
};

type StravaActivityRow = {
  activity_id: number;
  athlete_id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  timezone?: string | null;
  average_speed: number;
  average_cadence?: number | null;
  average_heartrate?: number | null;
  kilojoules?: number | null;
  calories?: number | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  device_name?: string | null;
  summary_polyline?: string | null;
  start_latlng?: unknown;
  end_latlng?: unknown;
  photo_url?: string | null;
  photos?: unknown;
  laps?: unknown;
  heart_rate_stream?: unknown;
};

function toLatLng(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;

  const lat = Number(value[0]);
  const lng = Number(value[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return [lat, lng];
}

function toLaps(value: unknown): StravaLap[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const laps: StravaLap[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const lap = item as Record<string, unknown>;
    const distance = Number(lap.distance ?? 0);
    const moving_time = Number(lap.moving_time ?? 0);
    const elapsed_time = Number(lap.elapsed_time ?? moving_time);
    if (!Number.isFinite(distance) || !Number.isFinite(moving_time)) return;

    const normalizedLap: StravaLap = {
      name: typeof lap.name === 'string' ? lap.name : null,
      lap_index: typeof lap.lap_index === 'number' ? lap.lap_index : 0,
      distance,
      moving_time,
      elapsed_time: Number.isFinite(elapsed_time) ? elapsed_time : moving_time,
      average_speed:
        typeof lap.average_speed === 'number' ? lap.average_speed : null,
      average_heartrate:
        typeof lap.average_heartrate === 'number'
          ? lap.average_heartrate
          : null,
      max_heartrate:
        typeof lap.max_heartrate === 'number' ? lap.max_heartrate : null,
    };
    if (typeof lap.id === 'number') {
      normalizedLap.id = lap.id;
    }
    laps.push(normalizedLap);
  });

  return laps;
}

function toHeartRateStream(value: unknown): StravaHeartRatePoint[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const point = item as Record<string, unknown>;
      const seconds = Number(point.seconds ?? 0);
      const bpm = Number(point.bpm ?? 0);
      if (!Number.isFinite(seconds) || !Number.isFinite(bpm)) return null;
      return { seconds, bpm };
    })
    .filter((item): item is StravaHeartRatePoint => Boolean(item));
}

function mapSupabaseRow(row: StravaActivityRow): StravaActivity {
  return {
    id: Number(row.activity_id),
    name: row.name,
    distance: Number(row.distance ?? 0),
    moving_time: Number(row.moving_time ?? 0),
    elapsed_time: Number(row.elapsed_time ?? 0),
    total_elevation_gain: Number(row.total_elevation_gain ?? 0),
    type: row.type,
    start_date: row.start_date,
    timezone: row.timezone ?? null,
    average_speed: Number(row.average_speed ?? 0),
    average_cadence:
      typeof row.average_cadence === 'number' ? row.average_cadence : null,
    average_heartrate:
      typeof row.average_heartrate === 'number' ? row.average_heartrate : null,
    kilojoules: typeof row.kilojoules === 'number' ? row.kilojoules : null,
    calories: typeof row.calories === 'number' ? row.calories : null,
    location_city: row.location_city ?? null,
    location_state: row.location_state ?? null,
    location_country: row.location_country ?? null,
    device_name: row.device_name ?? null,
    map: {
      summary_polyline: row.summary_polyline ?? null,
    },
    photos:
      row.photos && typeof row.photos === 'object'
        ? (row.photos as StravaActivity['photos'])
        : undefined,
    photoUrl: row.photo_url ?? null,
    start_latlng: toLatLng(row.start_latlng),
    end_latlng: toLatLng(row.end_latlng),
    laps: toLaps(row.laps),
    heartRateStream: toHeartRateStream(row.heart_rate_stream),
  };
}

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
    provider: 'strava',
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
    provider: 'strava',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: data.athlete?.id,
    athleteFirstName: data.athlete?.firstname ?? null,
    athleteProfileUrl:
      data.athlete?.profile_medium ?? data.athlete?.profile ?? null,
  };
}

export async function syncStravaActivitiesWithSupabase({
  athleteId,
  limit = 7,
}: SyncStravaActivitiesParams): Promise<{ synced: number }> {
  const response = await fetch(STRAVA_SYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ athlete_id: athleteId, limit }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to sync Strava activities.');
  }

  const payload = (await response.json()) as {
    synced?: number;
    success?: boolean;
    error?: string;
  };
  if (payload.success === false) {
    throw new Error(payload.error || 'Failed to sync Strava activities.');
  }
  return { synced: payload.synced ?? 0 };
}

export async function fetchActivitiesFromSupabase(
  athleteId: number,
  limit = 50,
): Promise<StravaActivity[]> {
  const { data, error } = await supabase
    .from(STRAVA_ACTIVITIES_TABLE)
    .select('*')
    .eq('athlete_id', athleteId)
    .order('start_date', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'Failed to fetch Strava activities.');
  }

  return ((data ?? []) as StravaActivityRow[]).map((row) =>
    mapSupabaseRow(row),
  );
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
  activity:
    | Pick<StravaActivity, 'laps' | 'pace_series' | 'moving_time'>
    | null
    | undefined,
): LapPaceChartPoint[] {
  if (!activity?.laps?.length) {
    return buildLapPaceChartDataFromPaceSeries(
      activity?.pace_series,
      activity?.moving_time,
    );
  }

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

function buildLapPaceChartDataFromPaceSeries(
  paceSeries: { x: number; y: number }[] | null | undefined,
  movingTimeFallback?: number,
): LapPaceChartPoint[] {
  if (!paceSeries?.length) return [];

  const validPoints = paceSeries
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .filter((point) => point.y > 0)
    .sort((a, b) => a.x - b.x);

  const laps: LapPaceChartPoint[] = [];
  for (let i = 1; i < validPoints.length; i += 1) {
    const prev = validPoints[i - 1];
    const current = validPoints[i];
    const movingTimeSec = current.x - prev.x;
    if (!Number.isFinite(movingTimeSec) || movingTimeSec <= 0) continue;

    const speedMetersPerSec = Math.max(0, prev.y);
    if (!speedMetersPerSec) continue;

    const distanceMeters = speedMetersPerSec * movingTimeSec;
    if (distanceMeters <= 0) continue;

    const paceSecPerKm = computePaceSecPerKm(distanceMeters, movingTimeSec);
    if (!paceSecPerKm) continue;

    laps.push({
      lapLabel: `Sample ${i}`,
      paceSecPerKm,
      paceText: formatPaceSecPerKm(paceSecPerKm),
      distanceMeters,
      movingTimeSec,
      averageHeartrate: null,
    });
  }

  if (!laps.length && movingTimeFallback && movingTimeFallback > 0) {
    const validCount = validPoints.length;
    if (!validCount) return [];

    const sumSpeed = validPoints.reduce((acc, point) => acc + point.y, 0);
    const averageSpeed = sumSpeed / validCount;
    if (averageSpeed <= 0) return [];

    const paceSecPerKm = 1000 / averageSpeed;
    const distanceMeters = averageSpeed * movingTimeFallback;
    if (distanceMeters <= 0) return [];

    return [
      {
        lapLabel: 'Sample 1',
        paceSecPerKm,
        paceText: formatPaceSecPerKm(paceSecPerKm),
        distanceMeters,
        movingTimeSec: movingTimeFallback,
        averageHeartrate: null,
      },
    ];
  }

  return laps;
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

export function getMockTokens(): AuthTokens {
  return {
    provider: 'mock',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    athleteId: 999999,
    athleteFirstName: 'Runner',
  };
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
