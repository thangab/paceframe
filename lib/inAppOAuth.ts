import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Platform } from 'react-native';

function routeOAuthCallback(callbackUrl: string) {
  const queryIndex = callbackUrl.indexOf('?');
  const query = queryIndex >= 0 ? callbackUrl.slice(queryIndex + 1) : '';
  router.replace(query ? `/oauth?${query}` : '/oauth');
}

function isOAuthCallbackUrl(url: string, redirectUri: string) {
  return url.startsWith(redirectUri);
}

async function openSafariViewOAuthSession(
  authUrl: string,
  redirectUri: string,
) {
  let didHandleCallback = false;
  let removeCallbackListener = () => {};

  const callbackResult = new Promise<WebBrowser.WebBrowserResult>((resolve) => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!isOAuthCallbackUrl(url, redirectUri)) return;

      didHandleCallback = true;
      subscription.remove();
      WebBrowser.dismissBrowser();
      routeOAuthCallback(url);
      resolve({ type: WebBrowser.WebBrowserResultType.DISMISS });
    });
    removeCallbackListener = () => {
      subscription.remove();
    };
  });

  const browserResult = WebBrowser.openBrowserAsync(authUrl, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });

  const result = await Promise.race([browserResult, callbackResult]);
  removeCallbackListener();
  if (!didHandleCallback) {
    WebBrowser.dismissBrowser();
  }

  return result;
}

export async function openInAppOAuthSession(authUrl: string, redirectUri: string) {
  if (Platform.OS === 'ios') {
    return openSafariViewOAuthSession(authUrl, redirectUri);
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
    preferEphemeralSession: false,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });

  if (result.type === 'success') {
    routeOAuthCallback(result.url);
  }

  return result;
}
