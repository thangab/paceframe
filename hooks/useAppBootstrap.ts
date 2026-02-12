import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export function useAppBootstrap() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateSubscription = useSubscriptionStore((s) => s.hydrate);

  useEffect(() => {
    hydrateAuth().then(() => {
      hydrateSubscription();
    });
  }, [hydrateAuth, hydrateSubscription]);
}
