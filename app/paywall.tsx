import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing } from '@/constants/theme';
import { getCurrentOffering, purchasePremiumPackage, restorePurchases, customerInfoIsPremium } from '@/lib/revenuecat';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export default function PaywallScreen() {
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const [loading, setLoading] = useState(false);
  const [offeringTitle, setOfferingTitle] = useState('Premium');
  const [packageLabel, setPackageLabel] = useState('Unlock');
  const [pkg, setPkg] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOffering() {
      try {
        setLoading(true);
        const offering = await getCurrentOffering();
        setOfferingTitle(offering?.serverDescription || 'Premium');
        const pack = offering?.availablePackages[0] ?? null;
        setPkg(pack);
        setPackageLabel(pack?.storeProduct?.priceString || 'Unlock');
      } catch {
        setMessage('RevenueCat is not configured. Add API keys to .env for live purchases.');
      } finally {
        setLoading(false);
      }
    }

    loadOffering();
  }, []);

  async function handlePurchase() {
    if (!pkg) {
      setMessage('No package available. Verify your RevenueCat offering setup.');
      return;
    }

    try {
      setLoading(true);
      const info = await purchasePremiumPackage(pkg);
      if (customerInfoIsPremium(info)) {
        setMessage('Premium unlocked.');
        router.replace('/preview');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Purchase failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    try {
      setLoading(true);
      const info = await restorePurchases();
      if (customerInfoIsPremium(info)) {
        setMessage('Purchase restored.');
        router.replace('/preview');
      } else {
        setMessage('No active premium subscription found.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PaceFrame {offeringTitle}</Text>
      <Text style={styles.bullet}>- All premium templates</Text>
      <Text style={styles.bullet}>- No watermark on exports</Text>
      <Text style={styles.bullet}>- Future premium packs</Text>

      <View style={styles.card}>
        <Text style={styles.freeTitle}>Free Tier</Text>
        <Text style={styles.freeLine}>1 template</Text>
        <Text style={styles.freeLine}>Watermark on export</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.premiumTitle}>Premium</Text>
        <Text style={styles.freeLine}>3+ templates</Text>
        <Text style={styles.freeLine}>No watermark</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : null}

      {!isPremium ? <PrimaryButton label={`Upgrade ${packageLabel}`} onPress={handlePurchase} disabled={loading} /> : null}
      <PrimaryButton label="Restore Purchases" onPress={handleRestore} disabled={loading} variant="secondary" />
      <PrimaryButton label="Back" onPress={() => router.back()} variant="secondary" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 28,
  },
  bullet: {
    color: colors.text,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  freeTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  premiumTitle: {
    color: colors.success,
    fontWeight: '800',
    marginBottom: 4,
  },
  freeLine: {
    color: colors.textMuted,
  },
  message: {
    color: colors.textMuted,
  },
});
