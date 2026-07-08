import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DeleteAccountRequest = {
  accessToken?: string;
  refreshToken?: string;
  athleteId?: number;
};

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get('STRAVA_CLIENT_ID');
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET');
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.message || 'Failed to refresh Strava token.');
  }

  return {
    accessToken: String(data.access_token),
    refreshToken:
      typeof data?.refresh_token === 'string' ? data.refresh_token : null,
    athleteId: typeof data?.athlete?.id === 'number' ? data.athlete.id : null,
  };
}

async function fetchStravaAthleteId(accessToken: string) {
  const response = await fetch('https://www.strava.com/api/v3/athlete', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return typeof data?.id === 'number' ? data.id : null;
}

async function deauthorizeStrava(accessToken: string) {
  const response = await fetch('https://www.strava.com/oauth/deauthorize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ access_token: accessToken }),
  });

  if (!response.ok && response.status !== 401) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || 'Strava deauthorization failed.');
  }
}

function isMissingRelationError(error: { code?: string; message?: string }) {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /relation .* does not exist/i.test(error.message ?? '') ||
    /could not find the table/i.test(error.message ?? '')
  );
}

async function deleteRowsForAthlete(
  supabase: ReturnType<typeof createClient>,
  athleteId: number,
) {
  const activityDelete = await supabase
    .from('strava_activities')
    .delete()
    .eq('athlete_id', athleteId);

  if (activityDelete.error && !isMissingRelationError(activityDelete.error)) {
    throw activityDelete.error;
  }

  const userDelete = await supabase
    .from('strava_users')
    .delete()
    .eq('athlete_id', athleteId);

  if (userDelete.error && !isMissingRelationError(userDelete.error)) {
    throw userDelete.error;
  }
}

async function hasStoredTokenForAthlete(
  supabase: ReturnType<typeof createClient>,
  athleteId: number,
  tokens: string[],
) {
  const candidateTokens = tokens.filter(Boolean);
  if (candidateTokens.length === 0) return false;

  const response = await supabase
    .from('strava_users')
    .select('access_token, refresh_token')
    .eq('athlete_id', athleteId)
    .maybeSingle();

  if (response.error) {
    if (isMissingRelationError(response.error)) return false;
    throw response.error;
  }

  const storedAccessToken =
    typeof response.data?.access_token === 'string'
      ? response.data.access_token
      : null;
  const storedRefreshToken =
    typeof response.data?.refresh_token === 'string'
      ? response.data.refresh_token
      : null;

  return candidateTokens.some(
    (token) => token === storedAccessToken || token === storedRefreshToken,
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { accessToken, refreshToken, athleteId } =
      (await req.json()) as DeleteAccountRequest;

    if (!accessToken || !refreshToken || !athleteId) {
      return new Response('Missing accessToken, refreshToken, or athleteId', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response('Missing Supabase service credentials', {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let verifiedAthleteId = await fetchStravaAthleteId(accessToken);
    let tokenForRevocation = accessToken;
    let refreshedRefreshToken: string | null = null;
    if (verifiedAthleteId !== athleteId) {
      const refreshed = await refreshAccessToken(refreshToken);
      tokenForRevocation = refreshed.accessToken;
      refreshedRefreshToken = refreshed.refreshToken;
      verifiedAthleteId = refreshed.athleteId;
    }

    if (verifiedAthleteId !== athleteId) {
      verifiedAthleteId = await fetchStravaAthleteId(tokenForRevocation);
    }

    if (verifiedAthleteId !== athleteId) {
      const hasStoredToken = await hasStoredTokenForAthlete(supabase, athleteId, [
        accessToken,
        refreshToken,
        tokenForRevocation,
        refreshedRefreshToken ?? '',
      ]);
      if (!hasStoredToken) {
        return new Response('Strava token does not match athleteId', {
          status: 403,
          headers: corsHeaders,
        });
      }
    }

    await deauthorizeStrava(tokenForRevocation);
    await deleteRowsForAthlete(supabase, athleteId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response((error as Error).message, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
