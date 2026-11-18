// In-app purchase for the Quoivo Pro subscriptions (App Store Connect group "Quoivo Pro").
// Product IDs must match App Store Connect exactly.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  restorePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ErrorCode,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';

export const PRO_SKUS = {
  monthly: 'com.napigo.baogiahoadon.pro.monthly',
  yearly: 'com.napigo.baogiahoadon.pro.yearly',
} as const;

const ALL_SKUS: string[] = [PRO_SKUS.monthly, PRO_SKUS.yearly];
const PRO_KEY = 'quoivo.pro.active';

export type ProOffer = { sku: string; displayPrice: string; title: string };

// Cached entitlement so Pro features work offline; refreshed from the App Store on launch and after purchase.
export async function readCachedPro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PRO_KEY)) === '1';
  } catch {
    return false;
  }
}

async function writePro(active: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PRO_KEY, active ? '1' : '0');
  } catch {
    // Storage failure only means Pro is re-checked next launch.
  }
}

let connected = false;
async function ensureConnection(): Promise<void> {
  if (connected) return;
  await initConnection();
  connected = true;
}

export async function loadProOffers(): Promise<ProOffer[]> {
  await ensureConnection();
  const products = (await fetchProducts({ skus: ALL_SKUS, type: 'subs' })) as ProductSubscription[];
  return products
    .map(p => ({ sku: p.id, displayPrice: p.displayPrice, title: p.displayName ?? p.id }))
    .sort((a, b) => ALL_SKUS.indexOf(a.sku) - ALL_SKUS.indexOf(b.sku));
}

// True when any Pro SKU is currently active on this Apple ID.
async function hasActivePro(): Promise<boolean> {
  const purchases: Purchase[] = await getAvailablePurchases();
  return purchases.some(p => ALL_SKUS.includes(p.productId));
}

export async function refreshPro(): Promise<boolean> {
  try {
    await ensureConnection();
    const active = await hasActivePro();
    await writePro(active);
    return active;
  } catch {
    return readCachedPro();
  }
}

// Buys one Pro plan. Resolves true when the App Store confirms the purchase.
export function buyPro(sku: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      sub.remove();
      errSub.remove();
      fn();
    };
    const sub = purchaseUpdatedListener(async (purchase: Purchase) => {
      if (purchase.productId !== sku) return;
      try {
        await finishTransaction({ purchase, isConsumable: false });
        await writePro(true);
        finish(() => resolve(true));
      } catch (e) {
        finish(() => reject(e));
      }
    });
    const errSub = purchaseErrorListener(err => {
      // User cancelling is not an error to show.
      finish(() => (err.code === ErrorCode.UserCancelled ? resolve(false) : reject(err)));
    });
    ensureConnection()
      .then(() =>
        requestPurchase({
          request: { apple: { sku }, google: { skus: [sku] } },
          type: 'subs',
        }),
      )
      .catch(err => finish(() => reject(err)));
  });
}

// Restores purchases made with this Apple ID (required by App Review for subscriptions).
export async function restorePro(): Promise<boolean> {
  await ensureConnection();
  await restorePurchases();
  const active = await hasActivePro();
  await writePro(active);
  return active;
}

export async function disconnectIap(): Promise<void> {
  if (!connected) return;
  connected = false;
  try {
    await endConnection();
  } catch {
    // Ignore: nothing to clean up if the connection is already gone.
  }
}
