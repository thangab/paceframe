export const GARMIN_APP_OAUTH_REDIRECT_URI = 'paceframe://app/oauth';
const DEFAULT_GARMIN_MOBILE_RETURN_URI =
  `${GARMIN_APP_OAUTH_REDIRECT_URI}?provider=garmin`;

export function buildGarminOAuthStartUrl({
  startUrl,
  returnTo = DEFAULT_GARMIN_MOBILE_RETURN_URI,
}: {
  startUrl: string;
  returnTo?: string;
}) {
  const url = new URL(startUrl);
  url.searchParams.set('return_to', returnTo);
  return url.toString();
}
