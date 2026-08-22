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
import { resolvePublicConfig } from "./publishable-key-cache";
import { getRevenueCatConfig, syncRevenueCatSubscription } from "./revenuecat.functions";

const STORE_TIMEOUT_MS = 15_000;

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
    try {
      const mod = await loadPurchases();
      if (!mod) return;
      const { Purchases, LOG_LEVEL } = mod;

      const platform = getPlatform();
      // C1 — the SDK key is publishable. Prefer the value baked in at build
      // time, then the last known-good cached value, and only then the network.
      // Without this, a single failed request on a cold start left in-app
      // purchases permanently unavailable for that launch.
      const buildTimeKey = (
        platform === "ios"
          ? (import.meta.env.VITE_REVENUECAT_APPLE_KEY as string | undefined)
          : (import.meta.env.VITE_REVENUECAT_GOOGLE_KEY as string | undefined)
      )?.trim();

      const apiKey = await resolvePublicConfig(
        `revenuecat:${platform}`,
        buildTimeKey || undefined,
        async () => (await getRevenueCatConfig({ data: { platform } })).apiKey,
      );

      if (!apiKey) throw new Error(`RevenueCat key unavailable for ${platform}`);

      if (import.meta.env.DEV) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      }

      await Purchases.configure({
        apiKey,
        appUserID: supabaseUserId ?? undefined,
      });

      _initialized = true;
    } catch (e) {
      // Never let store/config failures surface as an unhandled rejection —
      // the app must stay usable (and reviewable) without purchases.
      console.warn("[revenuecat] init failed", e);
      _initPromise = null;
    }
  })();

  return _initPromise;
}

export async function identifyRevenueCatUser(supabaseUserId: string): Promise<void> {
  if (!isNative() || !_initialized) return;
  try {
    const mod = await loadPurchases();
    if (!mod) return;
    await mod.Purchases.logIn({ appUserID: supabaseUserId });
  } catch (e) {
    console.warn("[revenuecat] logIn failed", e);
  }
}

export async function logOutRevenueCat(): Promise<void> {
  if (!isNative() || !_initialized) return;
  try {
    const mod = await loadPurchases();
    if (!mod) return;
    await mod.Purchases.logOut();
  } catch {
    /* anonymous user — safe to ignore */
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
type IAPPackageLike = any;

function periodFromRc(period: string | undefined | null): "monthly" | "yearly" | null {
  if (!period) return null;
  if (period === "P1M" || period === "MONTHLY") return "monthly";
  if (period === "P1Y" || period === "ANNUAL") return "yearly";
  return null;
}

function entitlementFromProductId(_productId: string): IAPEntitlement {
  return "pro";
}

/**
 * Never throws: a cold, flaky launch must show an "options unavailable" state
 * on the paywall, not trip an error boundary.
 */
export async function getIAPOfferings(): Promise<IAPOffering[]> {
  if (!isNative()) return [];
  let packages: IAPPackageLike[] = [];
  try {
    const mod = await loadPurchases();
    if (!mod) return [];
    const { Purchases } = mod;
    const { current } = await withStoreTimeout(
      Purchases.getOfferings(),
      STORE_TIMEOUT_MS,
      "Loading subscription options",
    );
    if (!current) return [];
    packages = current.availablePackages ?? [];
  } catch (e) {
    console.warn("[revenuecat] getOfferings failed", e);
    return [];
  }
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

/** True when a store error is just "the user tapped Cancel" — never an error to surface. */
export function isUserCancelledError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { userCancelled?: boolean; code?: unknown; message?: unknown };
  if (err.userCancelled === true) return true;
  const code = String(err.code ?? "");
  if (code === "1" || code.toUpperCase().includes("PURCHASE_CANCELLED")) return true;
  return /cancell?ed/i.test(String(err.message ?? ""));
}

/** Rejects if `p` doesn't settle in `ms`, so store calls can never hang forever. */
export function withStoreTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out. Check your connection.`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function purchasePackage(packageIdentifier: string): Promise<IAPCustomerInfo> {
  if (!isNative()) throw new Error("Native purchases are only available on iOS/Android");
  const mod = await loadPurchases();
  if (!mod) throw new Error("RevenueCat not available");

  const { Purchases } = mod;
  // The offerings lookup can hang offline — the purchase sheet itself must not
  // be timed out (the user may be entering a password / Face ID).
  const { current } = await withStoreTimeout(
    Purchases.getOfferings(),
    STORE_TIMEOUT_MS,
    "Loading subscription options",
  );
  if (!current) throw new Error("No offerings available");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
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
