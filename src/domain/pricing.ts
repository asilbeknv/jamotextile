/**
 * Pricing rules (pure functions, all amounts in whole UZS).
 *
 *   unit  = round(base × (1 − discount%)) + decoration fee
 *   line  = unit × qty + setup fee (once per line)
 *   gross = net × (1 + VAT%)
 *
 * discount% = best volume tier reached by the order's TOTAL quantity (all
 * items together), plus the company's individual discount, capped at
 * MAX_DISCOUNT_PCT. Minimum quantities are checked per item elsewhere.
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
  /** Quantity that selects the volume tier; defaults to this line's qty. */
  tierQty?: number;
};

export type LinePrice = { unitPrice: number; discountPct: number; setupFee: number; lineTotal: number };

export function priceLine(input: LinePriceInput): LinePrice {
  const { basePrice, qty, feePerUnit, tiers, companyDiscountPct = 0 } = input;
  if (qty <= 0) return { unitPrice: 0, discountPct: 0, setupFee: 0, lineTotal: 0 };
  const discountPct = Math.min(MAX_DISCOUNT_PCT, tierDiscount(input.tierQty ?? qty, tiers) + companyDiscountPct);
  const unitPrice = Math.round(basePrice * (1 - discountPct / 100)) + feePerUnit;
  const setupFee = input.setupFee;
  return { unitPrice, discountPct, setupFee, lineTotal: unitPrice * qty + setupFee };
}

export type OrderLine = Pick<LinePriceInput, "basePrice" | "qty" | "feePerUnit" | "setupFee">;

/** Prices every line of an order; the volume tier comes from the total quantity. */
export function priceOrder(lines: OrderLine[], tiers: Tier[], companyDiscountPct = 0) {
  const totalQty = lines.reduce((a, l) => a + Math.max(0, l.qty), 0);
  const priced = lines.map((l) => priceLine({ ...l, tiers, companyDiscountPct, tierQty: totalQty }));
  return { lines: priced, totalQty, net: priced.reduce((a, l) => a + l.lineTotal, 0) };
}

export function vatAmount(net: number, vatPct = VAT_PCT): number {
  return Math.round((net * vatPct) / 100);
}

export function grossAmount(net: number, vatPct = VAT_PCT): number {
  return net + vatAmount(net, vatPct);
}
