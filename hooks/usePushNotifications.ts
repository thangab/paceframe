import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/authStore';
import {
  getExpoPushTokenAsync,
  registerPushTokenWithBackend,
} from '@/lib/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const connections = useAuthStore((s) => s.connections);
  const activeProvider = useAuthStore((s) => s.activeProvider);
  const lastSyncedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {});

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const garminUserId = connections.garmin?.garminUserId?.trim();
    const stravaAthleteId = connections.strava?.athleteId ?? null;
    const isGarminConnected = Boolean(
      connections.garmin?.accessToken && garminUserId,
    );
    const isStravaConnected = Boolean(
      connections.strava?.accessToken && stravaAthleteId,
    );

    if (!isGarminConnected && !isStravaConnected) {
      lastSyncedKeyRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const expoPushToken = await getExpoPushTokenAsync();
        if (!expoPushToken || cancelled) return;

        const syncKey = [
          expoPushToken,
          activeProvider ?? 'none',
          garminUserId,
          stravaAthleteId,
        ].join('::');

        if (lastSyncedKeyRef.current === syncKey) {
          return;
        }

        await registerPushTokenWithBackend({
          expoPushToken,
          activeProvider,
          connections,
        });

        if (!cancelled) {
          lastSyncedKeyRef.current = syncKey;
        }
      } catch (error) {
        if (!cancelled) {
          console.warn(
            '[Push] Failed to register device for push notifications',
            error,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeProvider,
    connections,
    isHydrated,
  ]);
}
