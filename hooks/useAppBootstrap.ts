import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useThemeStore } from '@/store/themeStore';

export function useAppBootstrap() {
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateSubscription = useSubscriptionStore((s) => s.hydrate);

  useEffect(() => {
    hydrateTheme();
    hydrateAuth().then(() => {
      hydrateSubscription();
    });
  }, [hydrateTheme, hydrateAuth, hydrateSubscription]);
}
