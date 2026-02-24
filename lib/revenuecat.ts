import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

const ENTITLEMENT_ID = 'premium';

const REVENUECAT_KEY_PREFIX_BY_PLATFORM = {
  ios: 'appl_',
  android: 'goog_',
} as const;

function getRevenueCatApiKey() {
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  return Platform.OS === 'ios' ? iosKey : androidKey;
}

export function getRevenueCatConfigIssue(): string | null {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return 'Missing RevenueCat public SDK key for this platform.';
  }

  const expectedPrefix =
    Platform.OS === 'ios'
      ? REVENUECAT_KEY_PREFIX_BY_PLATFORM.ios
      : REVENUECAT_KEY_PREFIX_BY_PLATFORM.android;

  if (!apiKey.startsWith(expectedPrefix)) {
    return `Invalid RevenueCat key for ${Platform.OS}. Expected a public SDK key starting with "${expectedPrefix}".`;
  }

  return null;
}

export async function configureRevenueCat(appUserId?: string | null) {
  const issue = getRevenueCatConfigIssue();
  if (issue) {
    console.warn(`[RevenueCat] ${issue}`);
    return;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return;

  await Purchases.configure({ apiKey, appUserID: appUserId ?? undefined });
}

export function customerInfoIsPremium(info: CustomerInfo | null | undefined) {
  if (!info) return false;
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePremiumPackage(pkg: PurchasesPackage) {
  const result = await Purchases.purchasePackage(pkg);
  return result.customerInfo;
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

export function onCustomerInfoUpdated(listener: (info: CustomerInfo) => void) {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
