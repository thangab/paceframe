import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { PurchasesPackage } from 'react-native-purchases';
import { PrimaryButton } from '@/components/PrimaryButton';
import { radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  customerInfoIsPremium,
  getCurrentOffering,
  getRevenueCatConfigIssue,
  purchasePremiumPackage,
  restorePurchases,
} from '@/lib/revenuecat';
import { useSubscriptionStore } from '@/store/subscriptionStore';

type PlanKind = 'weekly' | 'annual';

function getPackageSearchText(pack: PurchasesPackage) {
  return `${pack.identifier} ${String(pack.packageType ?? '')}`.toLowerCase();
}

function findPlanPackage(
  packs: PurchasesPackage[],
  kind: PlanKind,
): PurchasesPackage | null {
  const keyword = kind === 'weekly' ? 'week' : 'annual';
  const found = packs.find((pack) =>
    getPackageSearchText(pack).includes(keyword),
  );
  return found ?? null;
}

function getPackagePriceLabel(pack: PurchasesPackage | null) {
  if (!pack) return null;
  const product = (pack as any).product ?? (pack as any).storeProduct;
  return product?.priceString ?? null;
}

export default function PaywallScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const [loading, setLoading] = useState(false);
  const [purchaseLoadingKind, setPurchaseLoadingKind] =
    useState<PlanKind | null>(null);
  const [offeringTitle, setOfferingTitle] = useState('Premium');
  const [weeklyPkg, setWeeklyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKind | null>(null);
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
        const configIssue = getRevenueCatConfigIssue();
        if (configIssue) {
          setMessage(configIssue);
          setWeeklyPkg(null);
          setAnnualPkg(null);
          return;
        }
        const offering = await getCurrentOffering();
        setOfferingTitle(offering?.serverDescription || 'Premium');
        const packs = offering?.availablePackages ?? [];
        const weekly = findPlanPackage(packs, 'weekly');
        const annual = findPlanPackage(packs, 'annual');

        setWeeklyPkg(weekly);
        setAnnualPkg(annual);
        if (weekly) {
          setSelectedPlan('weekly');
        } else if (annual) {
          setSelectedPlan('annual');
        } else {
          setSelectedPlan(null);
        }
        if (!weekly && !annual) {
          setMessage(
            'No weekly or annual package found. In RevenueCat, add packages with identifiers containing "weekly" and "annual".',
          );
        }
      } catch {
        setMessage(
          'No package available from RevenueCat. Verify product IDs and offering mapping in RevenueCat/App Store Connect.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadOffering();
  }, []);

  async function handlePurchase(kind: PlanKind) {
    const pkg = kind === 'weekly' ? weeklyPkg : annualPkg;
    if (!pkg) {
      setMessage(
        kind === 'weekly'
          ? 'Weekly package unavailable in current offering.'
          : 'Annual package unavailable in current offering.',
      );
      return;
    }

    try {
      setPurchaseLoadingKind(kind);
      const info = await purchasePremiumPackage(pkg);
      if (customerInfoIsPremium(info)) {
        setMessage('Premium unlocked.');
        router.replace('/preview');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Purchase failed.');
    } finally {
      setPurchaseLoadingKind(null);
    }
  }

  async function handleConfirmPurchase() {
    if (!selectedPlan) {
      setMessage('Select a plan first.');
      return;
    }
    await handlePurchase(selectedPlan);
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

  async function handleCancelAnytime() {
    try {
      const url =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions';
      await Linking.openURL(url);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Could not open subscription settings.',
      );
    }
  }

  const weeklyPrice = getPackagePriceLabel(weeklyPkg);
  const annualPrice = getPackagePriceLabel(annualPkg);
  const isAnyPurchaseLoading = purchaseLoadingKind !== null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdrop}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : null}

        {!isPremium ? (
          <View style={styles.offerList}>
            <View style={styles.offerRow}>
              <Pressable
                onPress={() => weeklyPkg && setSelectedPlan('weekly')}
                disabled={!weeklyPkg || loading || isAnyPurchaseLoading}
                style={[
                  styles.offerCard,
                  styles.offerCardHalf,
                  selectedPlan === 'weekly' ? styles.offerCardSelected : null,
                  !weeklyPkg ? styles.offerCardDisabled : null,
                ]}
              >
                <Text style={styles.offerTitle}>Weekly</Text>
                <Text style={styles.offerPrice}>
                  {weeklyPrice ?? 'Not available'}
                </Text>
                <Text style={styles.offerCaption}>
                  {selectedPlan === 'weekly' ? 'Selected' : 'Tap to select'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => annualPkg && setSelectedPlan('annual')}
                disabled={!annualPkg || loading || isAnyPurchaseLoading}
                style={[
                  styles.offerCard,
                  styles.offerCardHalf,
                  selectedPlan === 'annual' ? styles.offerCardSelected : null,
                  !annualPkg ? styles.offerCardDisabled : null,
                ]}
              >
                <Text style={styles.offerTitle}>Annual</Text>
                <Text style={styles.offerPrice}>
                  {annualPrice ?? 'Not available'}
                </Text>
                <Text style={styles.offerCaption}>
                  {selectedPlan === 'annual' ? 'Selected' : 'Tap to select'}
                </Text>
              </Pressable>
            </View>

            <PrimaryButton
              label={
                isAnyPurchaseLoading ? 'Processing...' : 'Confirm Purchase'
              }
              onPress={handleConfirmPurchase}
              disabled={
                loading ||
                isAnyPurchaseLoading ||
                !selectedPlan ||
                (selectedPlan === 'weekly' && !weeklyPkg) ||
                (selectedPlan === 'annual' && !annualPkg)
              }
            />
          </View>
        ) : null}
        <View style={styles.linksRow}>
          <Pressable
            onPress={handleRestore}
            disabled={loading || isAnyPurchaseLoading}
          >
            <Text
              style={[
                styles.linkText,
                loading || isAnyPurchaseLoading ? styles.linkDisabled : null,
              ]}
            >
              Restore Purchases
            </Text>
          </Pressable>
          <Pressable onPress={handleCancelAnytime}>
            <Text style={styles.linkText}>Cancel anytime</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xl,
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
    linksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    linkText: {
      color: colors.primary,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    linkDisabled: {
      opacity: 0.5,
    },
    offerList: {
      gap: spacing.sm,
    },
    offerRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    offerCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md + 2,
      padding: spacing.md,
      gap: spacing.xs,
    },
    offerCardHalf: {
      flex: 1,
    },
    offerCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    offerCardDisabled: {
      opacity: 0.55,
    },
    offerTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 16,
    },
    offerPrice: {
      color: colors.textMuted,
      fontWeight: '700',
    },
    offerCaption: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
