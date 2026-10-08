import { test } from "node:test";
import assert from "node:assert/strict";
import { grossAmount, nextTier, priceLine, tierDiscount, vatAmount } from "./pricing";
import { canAdvance, nextStage, stageProgress } from "./order-stages";
import { formatUzPhone, normalizeUzPhone } from "./phone";

const tiers = [
  { minQty: 100, pct: 5 },
  { minQty: 300, pct: 10 },
  { minQty: 1000, pct: 15 },
];

test("tier discount picks the best tier reached", () => {
  assert.equal(tierDiscount(99, tiers), 0);
  assert.equal(tierDiscount(100, tiers), 5);
  assert.equal(tierDiscount(450, tiers), 10);
  assert.equal(tierDiscount(5000, tiers), 15);
});

test("next tier is the smallest one above qty", () => {
  assert.deepEqual(nextTier(120, tiers), { minQty: 300, pct: 10 });
  assert.equal(nextTier(1000, tiers), null);
});

test("line price matches the prototype formula", () => {
  // 80 hoodies at 210 000, embroidery 9 000/pc + 180 000 setup, no tier
  const p = priceLine({ basePrice: 210_000, qty: 80, feePerUnit: 9_000, setupFee: 180_000, tiers });
  assert.deepEqual(p, { unitPrice: 219_000, discountPct: 0, setupFee: 180_000, lineTotal: 17_700_000 });
});

test("company discount stacks with tier and is capped", () => {
  const p = priceLine({ basePrice: 100_000, qty: 300, feePerUnit: 0, setupFee: 0, tiers, companyDiscountPct: 5 });
  assert.equal(p.discountPct, 15);
  assert.equal(p.unitPrice, 85_000);
  const capped = priceLine({ basePrice: 100_000, qty: 1000, feePerUnit: 0, setupFee: 0, tiers, companyDiscountPct: 50 });
  assert.equal(capped.discountPct, 30);
});

test("zero quantity costs nothing, including setup", () => {
  assert.equal(priceLine({ basePrice: 1, qty: 0, feePerUnit: 1, setupFee: 999, tiers }).lineTotal, 0);
});

test("VAT", () => {
  assert.equal(vatAmount(1_000_000), 120_000);
  assert.equal(grossAmount(1_000_000), 1_120_000);
});

test("stage flow", () => {
  assert.equal(nextStage("MOCKUP"), "QUOTE");
  assert.equal(nextStage("DONE"), null);
  assert.equal(nextStage("CANCELLED"), null);
  assert.equal(stageProgress("MOCKUP"), 0);
  assert.equal(stageProgress("DONE"), 100);
});

test("transition rules", () => {
  const base = { isPaid: false, workshopId: null };
  assert.equal(canAdvance({ ...base, stage: "QUOTE" }, "CUSTOMER").ok, true);
  assert.equal(canAdvance({ ...base, stage: "MOCKUP" }, "CUSTOMER").ok, false);
  assert.equal(canAdvance({ ...base, stage: "PAYMENT" }, "ADMIN").ok, false);
  assert.equal(canAdvance({ stage: "PAYMENT", isPaid: true, workshopId: null }, "ADMIN").ok, false);
  assert.equal(canAdvance({ stage: "PAYMENT", isPaid: true, workshopId: "w1" }, "ADMIN").ok, true);
  assert.equal(canAdvance({ ...base, stage: "DONE" }, "ADMIN").ok, false);
});

test("Uzbek phone normalisation", () => {
  assert.equal(normalizeUzPhone("+998 90 123-45-67"), "+998901234567");
  assert.equal(normalizeUzPhone("998901234567"), "+998901234567");
  assert.equal(normalizeUzPhone("90 123 45 67"), "+998901234567");
  assert.equal(normalizeUzPhone("12345"), null);
  assert.equal(formatUzPhone("+998901234567"), "+998 90 123-45-67");
});
