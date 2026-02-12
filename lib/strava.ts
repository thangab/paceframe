import { AuthTokens, StravaActivity } from '@/types/strava';
import { mockActivities } from '@/lib/mockData';

const STRAVA_BASE = 'https://www.strava.com/api/v3';
const USE_MOCK_STRAVA = process.env.EXPO_PUBLIC_USE_MOCK_STRAVA === 'true';

export type ExchangeCodeParams = {
  code: string;
  redirectUri: string;
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
  };
}

export async function fetchActivities(
  accessToken: string,
): Promise<StravaActivity[]> {
  if (USE_MOCK_STRAVA || accessToken.startsWith('mock-')) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return mockActivities;
  }

  const response = await fetch(`${STRAVA_BASE}/athlete/activities?per_page=3`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to fetch activities.');
  }

  const activities = (await response.json()) as StravaActivity[];
  const runs = activities;
  // .filter((activity) => activity.type === 'Run')

  const enriched = await Promise.all(
    runs.map(async (activity) => {
      const photoUrl = await fetchActivityPhotoUrl(accessToken, activity.id);
      return { ...activity, photoUrl };
    }),
  );
  // console.log('enriched', enriched);
  return enriched;
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
  };
}

// function extractActivityPhotoUrl(activity: StravaActivity): string | null {
//   const urls = activity.photos?.primary?.urls;
//   if (!urls) return null;

//   return (
//     urls['600'] ??
//     urls['100'] ??
//     Object.values(urls).find((value) => typeof value === 'string') ??
//     null
//   );
// }

async function fetchActivityPhotoUrl(
  accessToken: string,
  activityId: number,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${STRAVA_BASE}/activities/${activityId}/photos?size=600`,
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

    return (
      first.urls['600'] ??
      first.urls['100'] ??
      Object.values(first.urls).find((value) => typeof value === 'string') ??
      null
    );
  } catch {
    return null;
  }
}
