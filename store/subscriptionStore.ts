import { create } from 'zustand';
import Purchases from 'react-native-purchases';
import { customerInfoIsPremium, onCustomerInfoUpdated } from '@/lib/revenuecat';

type SubscriptionState = {
  isPremium: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
};

let unsubscribe: (() => void) | null = null;

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isPremium: false,
  isLoading: false,
  hydrate: async () => {
    set({ isLoading: true });

    try {
      const info = await Purchases.getCustomerInfo();
      set({ isPremium: customerInfoIsPremium(info), isLoading: false });
    } catch {
      set({ isPremium: false, isLoading: false });
    }

    if (!unsubscribe) {
      unsubscribe = onCustomerInfoUpdated((info) => {
        set({ isPremium: customerInfoIsPremium(info) });
      });
    }
  },
}));
