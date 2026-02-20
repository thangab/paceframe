export type StravaPolylineMap = {
  summary_polyline: string | null;
};

export type StravaActivityPhoto = {
  urls?: Record<string, string | undefined>;
  source?: number;
};

export type StravaActivityPhotos = {
  primary?: StravaActivityPhoto | null;
  count?: number;
};

export type StravaLap = {
  id?: number;
  name?: string | null;
  lap_index: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
};

export type StravaHeartRatePoint = {
  seconds: number;
  bpm: number;
};

export type StravaActivity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_latlng?: [number, number] | null;
  timezone?: string | null;
  average_speed: number;
  average_cadence?: number | null;
  average_heartrate?: number | null;
  kilojoules?: number | null;
  calories?: number | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  map: StravaPolylineMap;
  photos?: StravaActivityPhotos;
  photoUrl?: string | null;
  laps?: StravaLap[];
  heartRateStream?: StravaHeartRatePoint[];
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athleteId?: number;
  athleteFirstName?: string | null;
  athleteProfileUrl?: string | null;
};
