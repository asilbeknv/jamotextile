/**
 * Pricing rules (pure functions, all amounts in whole UZS).
 *
 *   unit  = round(base × (1 − discount%)) + decoration fee
 *   line  = unit × qty + setup fee (once per line)
 *   gross = net × (1 + VAT%)
 *
 * discount% = best volume tier reached by qty, plus the company's individual
 * discount, capped at MAX_DISCOUNT_PCT.
 */

export const VAT_PCT = 12;
export const MAX_DISCOUNT_PCT = 30;

export type Tier = { minQty: number; pct: number };

export function tierDiscount(qty: number, tiers: Tier[]): number {
  return tiers.reduce((best, t) => (qty >= t.minQty ? Math.max(best, t.pct) : best), 0);
}

export function nextTier(qty: number, tiers: Tier[]): Tier | null {
  return [...tiers].sort((a, b) => a.minQty - b.minQty).find((t) => t.minQty > qty) ?? null;
}

export type LinePriceInput = {
  basePrice: number;
  qty: number;
  feePerUnit: number;
  setupFee: number;
  tiers: Tier[];
  companyDiscountPct?: number;
};

export type LinePrice = { unitPrice: number; discountPct: number; setupFee: number; lineTotal: number };

export function priceLine(input: LinePriceInput): LinePrice {
  const { basePrice, qty, feePerUnit, tiers, companyDiscountPct = 0 } = input;
  if (qty <= 0) return { unitPrice: 0, discountPct: 0, setupFee: 0, lineTotal: 0 };
  const discountPct = Math.min(MAX_DISCOUNT_PCT, tierDiscount(qty, tiers) + companyDiscountPct);
  const unitPrice = Math.round(basePrice * (1 - discountPct / 100)) + feePerUnit;
  const setupFee = input.setupFee;
  return { unitPrice, discountPct, setupFee, lineTotal: unitPrice * qty + setupFee };
}

export function vatAmount(net: number, vatPct = VAT_PCT): number {
  return Math.round((net * vatPct) / 100);
}

export function grossAmount(net: number, vatPct = VAT_PCT): number {
  return net + vatAmount(net, vatPct);
}
