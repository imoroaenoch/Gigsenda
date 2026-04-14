import { db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getSettingSection } from "./admin-settings";

// ── Constants ────────────────────────────────────────────────────────────────
export const COMMISSION_RATE = 0.1; // 10% default fallback only

// Fetch live commission rate from Firestore admin settings
export async function getLiveCommissionRate(): Promise<number> {
  try {
    const settings = await getSettingSection("commission") as { percentage?: number } | null;
    if (settings?.percentage && settings.percentage > 0) {
      return settings.percentage / 100;
    }
  } catch {
    // fall through to default
  }
  return COMMISSION_RATE;
}

// ── Types ────────────────────────────────────────────────────────────────────
export type PricingModel = "fixed" | "package";

export interface PricePackage {
  label: string;
  description: string;
  price: number;
}

export interface ResolvedPricing {
  model: PricingModel;
  packages: PricePackage[];
  source: "provider" | "category";
}

// ── Commission helpers ───────────────────────────────────────────────────────
export function calcCommission(totalAmount: number, rate: number = COMMISSION_RATE) {
  const commission = Math.round(totalAmount * rate);
  return {
    totalAmount,
    commission,
    providerEarning: totalAmount - commission,
  };
}

// ── Package builder from a base price ───────────────────────────────────────
export function buildPackagesFromBase(
  basePrice: number,
  premiumPrice?: number | null
): PricePackage[] {
  const b = Math.round(basePrice);
  return [
    {
      label: "Basic",
      description: "Essential service, single visit",
      price: b,
    },
    {
      label: "Standard",
      description: "Thorough service with full coverage",
      price: Math.round(b * 1.5),
    },
    {
      label: "Premium",
      description: premiumPrice
        ? "Full team, deep service"
        : "Priority slot, premium finish",
      price: premiumPrice ? Math.round(premiumPrice) : Math.round(b * 2),
    },
  ];
}

// ── Pricing resolver: provider → category fallback ───────────────────────────
/**
 * Resolves pricing for a booking in this priority order:
 *   1. Provider's own basePrice (+ optional premiumPrice)
 *   2. Category fallback price stored in Firestore
 *
 * Never uses hardcoded prices — if nothing is found returns null.
 */
export async function resolvePricing(
  provider: Record<string, any>
): Promise<ResolvedPricing | null> {
  // ── 1. Provider-level pricing ─────────────────────────────────────────────
  const base =
    provider.basePrice ??
    provider.hourlyRate ??   // legacy field
    provider.price ??
    null;

  if (base && Number(base) > 0) {
    return {
      model: "package",
      packages: buildPackagesFromBase(
        Number(base),
        provider.premiumPrice ?? provider.teamRate ?? null
      ),
      source: "provider",
    };
  }

  // ── 2. Category fallback ──────────────────────────────────────────────────
  if (provider.category) {
    try {
      // Look up category by name
      const q = query(
        collection(db, "categories"),
        where("name", "==", provider.category)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const catData = snap.docs[0].data();
        const fallback = catData.fallbackPrice ?? null;
        if (fallback && Number(fallback) > 0) {
          return {
            model: "package",
            packages: buildPackagesFromBase(Number(fallback)),
            source: "category",
          };
        }
      }
    } catch {
      // silent — category lookup is best-effort
    }
  }

  return null;
}
