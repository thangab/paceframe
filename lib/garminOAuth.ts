export const GARMIN_APP_OAUTH_REDIRECT_URI = 'paceframe://app/oauth';

type GarminSessionResponse = {
  authUrl?: string;
  state?: string;
};

export async function buildGarminOAuthStartUrl() {
  const sessionUrl =
    process.env.EXPO_PUBLIC_GARMIN_OAUTH_SESSION_URL?.trim();
  if (!sessionUrl) {
    throw new Error('Missing EXPO_PUBLIC_GARMIN_OAUTH_SESSION_URL in .env');
  }

  const response = await fetch(sessionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      return_to: GARMIN_APP_OAUTH_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to create Garmin OAuth session.');
  }

  const payload = (await response.json()) as GarminSessionResponse;
  if (!payload.authUrl) {
    throw new Error('Garmin OAuth session did not return authUrl.');
  }

  return {
    authUrl: payload.authUrl,
    state: payload.state ?? null,
  };
}
