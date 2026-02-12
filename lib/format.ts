export type DistanceUnit = 'km' | 'mi';

const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;

export function formatDistanceMeters(distance: number, unit: DistanceUnit = 'km') {
  const divisor = unit === 'mi' ? METERS_PER_MILE : METERS_PER_KM;
  return `${(distance / divisor).toFixed(2)} ${unit}`;
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(
  distanceMeters: number,
  seconds: number,
  unit: DistanceUnit = 'km',
) {
  if (!distanceMeters || !seconds) return `--:-- /${unit}`;

  const divisor = unit === 'mi' ? METERS_PER_MILE : METERS_PER_KM;
  const paceSeconds = seconds / (distanceMeters / divisor);
  let m = Math.floor(paceSeconds / 60);
  let s = Math.round(paceSeconds % 60);

  // Handle 59.6s -> 60s rounding edge case.
  if (s === 60) {
    m += 1;
    s = 0;
  }

  return `${m}:${String(s).padStart(2, '0')} /${unit}`;
}

export function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  return date.toLocaleDateString();
}
