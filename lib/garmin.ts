import { StravaActivity } from '@/types/strava';
import { supabase } from '@/lib/supabaseClient';

const BACKFILL_URL = 'https://paceframe.app/api/garmin/backfill';
const DEREGISTRATION_URL = 'https://paceframe.app/api/garmin/deregistration';
const PERMISSIONS_URL = 'https://paceframe.app/api/garmin/permissions';
const VIEW_WITH_DETAILS = 'garmin_activities_with_details';

type GarminPermissionsResponse = {
  success?: boolean;
  error?: string;
  permissions?: string[];
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 0;
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return '';
}

function normalizeGarminActivityType(value: unknown): string {
  const raw = toStringValue(value).trim().toLowerCase();
  if (!raw) return 'Workout';

  if (
    raw === 'run' ||
    raw === 'running' ||
    raw === 'outdoor_run' ||
    raw === 'indoor_run'
  ) {
    return 'Run';
  }
  if (raw === 'ride' || raw === 'cycling' || raw === 'virtual_ride') {
    return 'Ride';
  }
  if (raw === 'walk' || raw === 'walking') return 'Walk';
  if (raw === 'hike' || raw === 'hiking') return 'Hike';
  if (raw === 'swim' || raw === 'swimming') return 'Swim';
  if (raw === 'row' || raw === 'rowing') return 'Rowing';

  return toStringValue(value).trim() || 'Workout';
}

function toIsoDate(row: Record<string, unknown>): string {
  const startTime = toStringValue(row.start_time).trim();
  if (startTime) return startTime;

  const startTimeSeconds = toNumber(row.start_time_in_seconds);
  if (!startTimeSeconds) return new Date().toISOString();
  const date = new Date(startTimeSeconds * 1000);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeActivityId(row: Record<string, unknown>): number {
  const activityId = toNumber(row.activity_id);
  if (activityId > 0 && Number.isFinite(activityId)) return activityId;

  const summaryId = toStringValue(row.summary_id).trim();
  const summaryNumeric = Number(summaryId);
  if (Number.isFinite(summaryNumeric) && summaryNumeric > 0)
    return summaryNumeric;

  let hash = 0;
  for (let i = 0; i < summaryId.length; i++) {
    hash = (hash * 31 + summaryId.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash || 1);
}

type PaceSeriesPoint = { x: number; y: number };

function toPaceSeriesMetersPerSecond(value: unknown): PaceSeriesPoint[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is { x: number; y: number } =>
        item != null &&
        typeof item === 'object' &&
        Number.isFinite(Number((item as { x?: unknown }).x)) &&
        Number.isFinite(Number((item as { y?: unknown }).y)),
    )
    .map((item) => ({
      x: Number((item as { x: unknown }).x),
      y: Number((item as { y: unknown }).y),
    }))
    .filter((point) => point.y > 0) // y = speedMetersPerSecond
    .sort((a, b) => a.x - b.x);
}

function toHeartRateSeriesFromRaw(
  value: unknown,
  startTimeSeconds?: number,
): StravaActivity['heartRateStream'] {
  if (!Array.isArray(value)) return [];
  const baseTime = toNumber(startTimeSeconds);
  const hasBaseTime = baseTime > 0;

  return value
    .filter(
      (item): item is { x: number; y: number } =>
        item != null &&
        typeof item === 'object' &&
        Number.isFinite(Number((item as { x?: unknown }).x)) &&
        Number.isFinite(Number((item as { y?: unknown }).y)),
    )
    .map((item) => ({
      x: Number((item as { x: unknown }).x),
      y: Number((item as { y: unknown }).y),
    }))
    .map((point) => ({
      x: hasBaseTime ? point.x - baseTime : point.x,
      y: point.y,
    }))
    .filter((point) => point.x >= 0 && point.y > 0)
    .map((point) => ({ seconds: point.x, bpm: point.y }));
}

function mapRow(
  row: Record<string, unknown>,
): StravaActivity {
  const movedSeconds = toNumber(
    row.moving_duration_seconds || row.duration_seconds,
  );
  const elapsedSeconds = toNumber(row.duration_seconds) || movedSeconds;
  const activityStartSeconds = toNumber(row.start_time_in_seconds);
  const paceSeries = toPaceSeriesMetersPerSecond(row.pace_series);

  return {
    id: normalizeActivityId(row),
    name:
      toStringValue(row.activity_name) ||
      `Garmin ${toStringValue(row.summary_id) || 'activity'}`,
    distance: toNumber(row.distance_meters),
    moving_time: movedSeconds,
    elapsed_time: elapsedSeconds,
    total_elevation_gain: toNumber(row.total_elevation_gain_m),
    type: normalizeGarminActivityType(row.activity_type),
    start_date: toIsoDate(row),
    average_speed: toNumber(row.average_speed_mps),
    average_heartrate: toNumber(row.average_hr_bpm),
    device_name: toStringValue(row.device_name) || null,
    calories: toNumber(row.active_kilocalories),
    map: {
      summary_polyline:
        typeof row.summary_polyline === 'string'
          ? row.summary_polyline.trim() || null
          : null,
    },
    start_latlng: parseStartLatLng(row.start_latlng),
    heartRateStream: toHeartRateSeriesFromRaw(row.hr_series, activityStartSeconds),
    pace_series: paceSeries,
  };
}

async function triggerBackfill(garminUserId: string): Promise<void> {
  const body = JSON.stringify({ garmin_user_id: garminUserId });
  const response = await fetch(BACKFILL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Backfill request failed.');
  }
}

export async function deregisterGarminUser(
  garminUserId: string,
): Promise<void> {
  const normalizedGarminUserId = garminUserId.trim();
  if (!normalizedGarminUserId) {
    throw new Error('Missing garminUserId.');
  }

  const response = await fetch(DEREGISTRATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ garmin_user_id: normalizedGarminUserId }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    const fallbackMessage = await response.text().catch(() => '');
    throw new Error(
      payload?.error || fallbackMessage || 'Garmin deregistration failed.',
    );
  }
}

export async function syncGarminPermissions(
  garminUserId: string,
): Promise<string[]> {
  const normalizedGarminUserId = garminUserId.trim();
  if (!normalizedGarminUserId) {
    throw new Error('Missing garminUserId.');
  }

  const url = new URL(PERMISSIONS_URL);
  url.searchParams.set('garmin_user_id', normalizedGarminUserId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | GarminPermissionsResponse
    | null;

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || 'Failed to fetch Garmin permissions.',
    );
  }

  return Array.isArray(payload?.permissions) ? payload.permissions : [];
}

async function fetchFromSupabase(
  garminUserId: string,
): Promise<StravaActivity[]> {
  const { data: summaryRows, error } = await supabase
    .from(VIEW_WITH_DETAILS)
    .select('*')
    .eq('garmin_user_id', garminUserId)
    .order('start_time', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(
      error.message || 'Failed to fetch Garmin activities with details.',
    );
  }

  const summaries = (summaryRows ?? []) as Record<string, unknown>[];
  console.log('[Garmin][Supabase] query', {
    table: VIEW_WITH_DETAILS,
    garminUserId,
    summaryCount: summaries.length,
  });

  return summaries.map((row) => mapRow(row));
}

function parseStartLatLng(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;

  const [latRaw, lngRaw] = value;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return [lat, lng];
}

export async function fetchGarminActivities(
  _accessToken: string,
  garminUserId?: string,
): Promise<StravaActivity[]> {
  if (!garminUserId) {
    throw new Error('Missing garminUserId.');
  }
  const normalizedGarminUserId = garminUserId.trim();
  if (!normalizedGarminUserId) {
    throw new Error('Missing garminUserId.');
  }

  const [activities] = await Promise.all([
    fetchFromSupabase(normalizedGarminUserId),
    triggerBackfill(normalizedGarminUserId),
  ]);

  return activities;
}
