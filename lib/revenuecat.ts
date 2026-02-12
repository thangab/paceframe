import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

const ENTITLEMENT_ID = 'premium';

export async function configureRevenueCat(appUserId?: string | null) {
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  const apiKey = Platform.OS === 'ios' ? iosKey : androidKey;

  if (!apiKey) {
    return;
  }

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
