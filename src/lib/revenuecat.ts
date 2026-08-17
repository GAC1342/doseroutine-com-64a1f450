/**
 * RevenueCat client-side integration for iOS/Android in-app purchases.
 *
 * On web this module is a no-op — Stripe still handles all web checkout.
 * The RevenueCat SDK is only loaded and initialized on native platforms.
 *
 * Entitlements (configured in the RevenueCat dashboard):
 *   - "pro"   → maps to Pro SKUs on both stores
 */
import { isNative, getPlatform } from "./platform";
import { getRevenueCatConfig, syncRevenueCatSubscription } from "./revenuecat.functions";

export type IAPEntitlement = "pro";

export interface IAPOffering {
  identifier: string;
  productId: string;
  priceString: string;
  period: "monthly" | "yearly";
  introPriceString?: string | null;
  freeTrialDays?: number | null;
  entitlement: IAPEntitlement;
}

export interface IAPCustomerInfo {
  activeEntitlements: IAPEntitlement[];
  latestExpirationDate: string | null;
  managementURL: string | null;
}

let _initialized = false;
let _initPromise: Promise<void> | null = null;

async function loadPurchases() {
  if (!isNative()) return null;
  // Dynamic import so the RN/native SDK is never pulled into web bundles.
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod;
}

export async function initRevenueCat(supabaseUserId: string | null): Promise<void> {
  if (!isNative()) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const mod = await loadPurchases();
    if (!mod) return;
    const { Purchases, LOG_LEVEL } = mod;

    const platform = getPlatform();
    const { apiKey } = await getRevenueCatConfig({ data: { platform } });

    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    }

    await Purchases.configure({
      apiKey,
      appUserID: supabaseUserId ?? undefined,
    });

    _initialized = true;
  })();

  return _initPromise;
}

export async function identifyRevenueCatUser(supabaseUserId: string): Promise<void> {
  if (!isNative() || !_initialized) return;
  const mod = await loadPurchases();
  if (!mod) return;
  await mod.Purchases.logIn({ appUserID: supabaseUserId });
}

export async function logOutRevenueCat(): Promise<void> {
  if (!isNative() || !_initialized) return;
  const mod = await loadPurchases();
  if (!mod) return;
  try {
    await mod.Purchases.logOut();
  } catch {
    /* anonymous user — safe to ignore */
  }
}

function periodFromRc(period: string | undefined | null): "monthly" | "yearly" | null {
  if (!period) return null;
  if (period === "P1M" || period === "MONTHLY") return "monthly";
  if (period === "P1Y" || period === "ANNUAL") return "yearly";
  return null;
}

function entitlementFromProductId(_productId: string): IAPEntitlement {
  return "pro";
}

export async function getIAPOfferings(): Promise<IAPOffering[]> {
  if (!isNative()) return [];
  const mod = await loadPurchases();
  if (!mod) return [];
  const { Purchases } = mod;

  const { current } = await Purchases.getOfferings();
  if (!current) return [];

  const packages = current.availablePackages ?? [];
  const offerings: IAPOffering[] = [];

  for (const pkg of packages) {
    const product = pkg.product;
    const period = periodFromRc(product.subscriptionPeriod);
    if (!period) continue;
    const introDays = product.introPrice?.periodNumberOfUnits ?? null;
    offerings.push({
      identifier: pkg.identifier,
      productId: product.identifier,
      priceString: product.priceString,
      period,
      introPriceString: product.introPrice?.priceString ?? null,
      freeTrialDays: introDays,
      entitlement: entitlementFromProductId(product.identifier),
    });
  }

  return offerings;
}

export async function purchasePackage(packageIdentifier: string): Promise<IAPCustomerInfo> {
  if (!isNative()) throw new Error("Native purchases are only available on iOS/Android");
  const mod = await loadPurchases();
  if (!mod) throw new Error("RevenueCat not available");

  const { Purchases } = mod;
  const { current } = await Purchases.getOfferings();
  if (!current) throw new Error("No offerings available");
  const pkg = current.availablePackages?.find((p: any) => p.identifier === packageIdentifier);
  if (!pkg) throw new Error(`Package ${packageIdentifier} not found`);

  const result = await Purchases.purchasePackage({ aPackage: pkg });
  // Mirror the entitlement into our subscriptions table so the app reflects
  // Pro immediately — don't wait for the RevenueCat webhook round-trip.
  try {
    await syncRevenueCatSubscription({ data: {} });
  } catch (e) {
    console.warn("[revenuecat] post-purchase sync failed", e);
  }
  return normalizeCustomerInfo(result.customerInfo);
}

export async function restorePurchases(): Promise<IAPCustomerInfo> {
  if (!isNative())
    return { activeEntitlements: [], latestExpirationDate: null, managementURL: null };
  const mod = await loadPurchases();
  if (!mod) return { activeEntitlements: [], latestExpirationDate: null, managementURL: null };
  const result = await mod.Purchases.restorePurchases();
  const info = normalizeCustomerInfo(result.customerInfo);
  // Always call our server-side sync after a restore. Pure restores where
  // nothing changed on Apple/Google's side never trigger a RevenueCat
  // webhook, so this is the only way our subscriptions table gets updated.
  try {
    await syncRevenueCatSubscription({ data: {} });
  } catch (e) {
    console.warn("[revenuecat] post-restore sync failed", e);
  }
  return info;
}

export async function getCustomerInfo(): Promise<IAPCustomerInfo> {
  if (!isNative())
    return { activeEntitlements: [], latestExpirationDate: null, managementURL: null };
  const mod = await loadPurchases();
  if (!mod) return { activeEntitlements: [], latestExpirationDate: null, managementURL: null };
  const result = await mod.Purchases.getCustomerInfo();
  return normalizeCustomerInfo(result.customerInfo);
}

function normalizeCustomerInfo(info: any): IAPCustomerInfo {
  const active = info?.entitlements?.active ?? {};
  const entitlements: IAPEntitlement[] = Object.keys(active).filter(
    (k): k is IAPEntitlement => k === "pro",
  );
  let latest: string | null = null;
  for (const e of entitlements) {
    const exp = active[e]?.expirationDate ?? null;
    if (exp && (!latest || new Date(exp) > new Date(latest))) latest = exp;
  }
  return {
    activeEntitlements: entitlements,
    latestExpirationDate: latest,
    managementURL: info?.managementURL ?? null,
  };
}
