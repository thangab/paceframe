import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

function routeOAuthCallback(callbackUrl: string) {
  const queryIndex = callbackUrl.indexOf('?');
  const query = queryIndex >= 0 ? callbackUrl.slice(queryIndex + 1) : '';
  router.replace(query ? `/oauth?${query}` : '/oauth');
}

export async function openInAppOAuthSession(authUrl: string, redirectUri: string) {
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
    preferEphemeralSession: false,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });

  if (result.type === 'success') {
    routeOAuthCallback(result.url);
  }

  return result;
}
