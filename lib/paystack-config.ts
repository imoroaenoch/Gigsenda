import { getAdminDb } from "./admin-db";

let _cachedSecret: string | null = null;
let _cachedAt = 0;
const CACHE_TTL = 60_000; // 1 minute cache

export async function getPaystackSecret(): Promise<string> {
  const now = Date.now();
  if (_cachedSecret && now - _cachedAt < CACHE_TTL) return _cachedSecret;

  try {
    const db = getAdminDb();
    const snap = await db.doc("app_settings/payment").get();
    if (snap.exists) {
      const data = snap.data();
      const key = data?.paystackSecretKey as string | undefined;
      if (key && key.startsWith("sk_")) {
        _cachedSecret = key;
        _cachedAt = now;
        return key;
      }
    }
  } catch (e) {
    console.error("[paystack-config] Failed to read key from Firestore:", e);
  }

  const envKey = process.env.PAYSTACK_SECRET_KEY;
  if (envKey) return envKey;

  throw new Error("Paystack secret key not configured. Please set it in Admin → Settings → Payment.");
}

export async function getAppUrl(): Promise<string> {
  try {
    const db = getAdminDb();
    const snap = await db.doc("app_settings/general").get();
    if (snap.exists) {
      const url = snap.data()?.websiteUrl as string | undefined;
      if (url && url.startsWith("http")) return url.replace(/\/$/, "");
    }
  } catch (e) {
    console.error("[paystack-config] Failed to read websiteUrl from Firestore:", e);
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function getPaystackPublicKey(): Promise<string> {
  try {
    const db = getAdminDb();
    const snap = await db.doc("app_settings/payment").get();
    if (snap.exists) {
      const data = snap.data();
      const key = data?.paystackPublicKey as string | undefined;
      if (key && key.startsWith("pk_")) return key;
    }
  } catch (e) {
    console.error("[paystack-config] Failed to read public key from Firestore:", e);
  }

  const envKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (envKey) return envKey;

  throw new Error("Paystack public key not configured.");
}
