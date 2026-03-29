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
  end_latlng?: [number, number] | null;
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
  map: StravaPolylineMap;
  photos?: StravaActivityPhotos;
  photoUrl?: string | null;
  photoThumbUrl?: string | null;
  laps?: StravaLap[];
  heartRateStream?: StravaHeartRatePoint[];
  // Garmin detail stream: x = sample startTimeInSeconds (epoch seconds), y = speedMetersPerSecond
  pace_series?: { x: number; y: number }[];
};

export type AuthProvider = 'strava' | 'garmin' | 'mock';

export type AuthTokens = {
  provider: AuthProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  garminUserId?: string | null;
  athleteId?: number;
  athleteFirstName?: string | null;
  athleteProfileUrl?: string | null;
};

export type AuthConnections = Partial<Record<AuthProvider, AuthTokens>>;

export type PersistedAuthState = {
  activeProvider: AuthProvider | null;
  connections: AuthConnections;
};

export type LegacyAuthTokens = {
  provider?: AuthProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  garminUserId?: string | null;
  athleteId?: number;
  athleteFirstName?: string | null;
  athleteProfileUrl?: string | null;
};
