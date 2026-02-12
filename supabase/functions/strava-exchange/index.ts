import { corsHeaders } from '../_shared/cors.ts';

type ExchangeRequest = {
  code: string;
  redirectUri: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, redirectUri } = (await req.json()) as ExchangeRequest;

    if (!code || !redirectUri) {
      return new Response('Missing code or redirectUri', {
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
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.text();

    return new Response(data, {
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
