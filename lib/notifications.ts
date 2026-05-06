import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AuthConnections, AuthProvider } from '@/types/strava';

const PUSH_REGISTRATION_URL =
  process.env.EXPO_PUBLIC_PUSH_REGISTRATION_URL?.trim() ?? '';

type PushRegistrationPayload = {
  expo_push_token: string;
  platform: string;
  active_provider: AuthProvider | null;
  garmin_user_id?: string;
  strava_athlete_id?: number;
};

function getProjectId() {
  const expoProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  return typeof expoProjectId === 'string' && expoProjectId.trim()
    ? expoProjectId.trim()
    : null;
}

export async function getExpoPushTokenAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const permissionStatus = await Notifications.getPermissionsAsync();
  let finalStatus = permissionStatus.status;

  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('Missing Expo EAS projectId for push notifications.');
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function registerPushTokenWithBackend(params: {
  expoPushToken: string;
  activeProvider: AuthProvider | null;
  connections: AuthConnections;
}) {
  if (!PUSH_REGISTRATION_URL) {
    console.warn(
      '[Push] Missing EXPO_PUBLIC_PUSH_REGISTRATION_URL. Push token was not sent to the backend.',
    );
    return;
  }

  const garminUserId = params.connections.garmin?.garminUserId?.trim();
  const stravaAthleteId = params.connections.strava?.athleteId;
  const payload: PushRegistrationPayload = {
    expo_push_token: params.expoPushToken,
    platform: Platform.OS,
    active_provider: params.activeProvider,
  };

  if (garminUserId) {
    payload.garmin_user_id = garminUserId;
  }

  if (typeof stravaAthleteId === 'number') {
    payload.strava_athlete_id = stravaAthleteId;
  }

  const response = await fetch(PUSH_REGISTRATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => null)) as {
    success?: boolean;
    error?: string;
  } | null;

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.error || 'Failed to register push token with backend.',
    );
  }
}
