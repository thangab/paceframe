import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '@/components/PrimaryButton';
import { radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getCurrentOffering, purchasePremiumPackage, restorePurchases, customerInfoIsPremium } from '@/lib/revenuecat';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export default function PaywallScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const [loading, setLoading] = useState(false);
  const [offeringTitle, setOfferingTitle] = useState('Premium');
  const [packageLabel, setPackageLabel] = useState('Unlock');
  const [pkg, setPkg] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const features = [
    'All premium templates',
    'No watermark on exports',
    'Future premium packs included',
  ];

  useEffect(() => {
    async function loadOffering() {
      try {
        setLoading(true);
        const offering = await getCurrentOffering();
        setOfferingTitle(offering?.serverDescription || 'Premium');
        const pack = offering?.availablePackages[0] ?? null;
        setPkg(pack);
        const product = (pack as any)?.product ?? (pack as any)?.storeProduct;
        setPackageLabel(product?.priceString || 'Unlock');
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
      <LinearGradient
        colors={[colors.background, colors.surfaceAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdrop}
      />
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <MaterialCommunityIcons
            name="crown-outline"
            size={14}
            color={colors.primaryText}
          />
          <Text style={styles.heroBadgeText}>Premium</Text>
        </View>
        <Text style={styles.title}>PaceFrame {offeringTitle}</Text>
        <Text style={styles.subtitle}>
          Unlock all creative templates and export without watermark.
        </Text>
      </View>

      <View style={styles.features}>
        {features.map((item) => (
          <View key={item} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <MaterialCommunityIcons
                name="check"
                size={14}
                color={colors.primaryText}
              />
            </View>
            <Text style={styles.bullet}>{item}</Text>
          </View>
        ))}
      </View>

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: colors.background,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    hero: {
      borderRadius: radius.lg + 2,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: 6,
      shadowColor: colors.text,
      shadowOpacity: 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    heroBadgeText: {
      color: colors.primaryText,
      fontWeight: '800',
      fontSize: 12,
    },
    title: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 30,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    features: {
      gap: 8,
      marginTop: 2,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureIcon: {
      width: 20,
      height: 20,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bullet: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md + 2,
      padding: spacing.md,
    },
    freeTitle: {
      color: colors.text,
      fontWeight: '800',
      marginBottom: 4,
    },
    premiumTitle: {
      color: colors.success,
      fontWeight: '900',
      marginBottom: 4,
    },
    freeLine: {
      color: colors.textMuted,
      fontWeight: '600',
    },
    message: {
      color: colors.textMuted,
    },
  });
}
