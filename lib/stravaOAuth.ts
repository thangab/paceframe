export const STRAVA_REDIRECT_URI = 'paceframe://app/oauth';
const STRAVA_MOBILE_AUTHORIZE_BASE =
  'https://www.strava.com/oauth/mobile/authorize';
const STRAVA_SCOPE = 'read,activity:read_all';

type BuildAuthorizeUrlParams = {
  clientId: string;
};

export function buildStravaMobileAuthorizeUrl({
  clientId,
}: BuildAuthorizeUrlParams) {
  return (
    `${STRAVA_MOBILE_AUTHORIZE_BASE}?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}` +
    '&response_type=code' +
    `&scope=${encodeURIComponent(STRAVA_SCOPE)}`
  );
}
