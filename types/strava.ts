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

export type StravaActivity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  average_speed: number;
  map: StravaPolylineMap;
  photos?: StravaActivityPhotos;
  photoUrl?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athleteId?: number;
};
