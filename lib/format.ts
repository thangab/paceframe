export function formatDistanceMeters(distance: number) {
  return `${(distance / 1000).toFixed(2)} km`;
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

export function formatPace(distanceMeters: number, seconds: number) {
  if (!distanceMeters || !seconds) return '--:-- /km';
  const paceSeconds = seconds / (distanceMeters / 1000);
  const m = Math.floor(paceSeconds / 60);
  const s = Math.round(paceSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  return date.toLocaleDateString();
}
