export const STRAVA_REDIRECT_URI = 'paceframe://app/oauth';
const STRAVA_AUTHORIZE_BASE = 'https://www.strava.com/oauth/authorize';
const STRAVA_SCOPE = 'read,activity:read_all';

type BuildAuthorizeUrlParams = {
  clientId: string;
};

export function buildStravaAuthorizeUrl({
  clientId,
}: BuildAuthorizeUrlParams) {
  return (
    `${STRAVA_AUTHORIZE_BASE}?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}` +
    '&response_type=code' +
    `&scope=${encodeURIComponent(STRAVA_SCOPE)}`
  );
}
