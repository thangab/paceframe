import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type RefreshRequest = {
  refreshToken: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { refreshToken } = (await req.json()) as RefreshRequest;
    if (!refreshToken) {
      return new Response('Missing refreshToken', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const clientId = Deno.env.get('STRAVA_CLIENT_ID');
    const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return new Response('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET', {
        status: 500,
        headers: corsHeaders,
      });
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceRoleKey && data?.athlete?.id) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase.from('strava_users').upsert(
        {
          athlete_id: data.athlete.id,
          username: data.athlete.username ?? null,
          firstname: data.athlete.firstname ?? null,
          lastname: data.athlete.lastname ?? null,
          city: data.athlete.city ?? null,
          state: data.athlete.state ?? null,
          country: data.athlete.country ?? null,
          profile_medium: data.athlete.profile_medium ?? null,
          profile: data.athlete.profile ?? null,
          access_token: data.access_token ?? null,
          refresh_token: data.refresh_token ?? null,
          expires_at: data.expires_at ?? null,
          raw: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'athlete_id' },
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
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

