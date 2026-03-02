import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useThemeStore } from '@/store/themeStore';

export function useAppBootstrap() {
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateSubscription = useSubscriptionStore((s) => s.hydrate);
  const hydratePreferences = usePreferencesStore((s) => s.hydrate);

  useEffect(() => {
    hydrateTheme();
    hydratePreferences();
    hydrateAuth().then(() => {
      hydrateSubscription();
    });
  }, [hydrateTheme, hydratePreferences, hydrateAuth, hydrateSubscription]);
}
