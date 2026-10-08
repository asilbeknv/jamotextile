import "server-only";
import { db } from "@/lib/db";

export async function getCatalog() {
  const [products, colors, methods, tiers] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.color.findMany(),
    db.decorationMethod.findMany({ where: { isActive: true }, orderBy: { feePerUnit: "desc" } }),
    db.discountTier.findMany({ orderBy: { minQty: "asc" } }),
  ]);
  return { products, colors, methods, tiers };
}

export type Catalog = Awaited<ReturnType<typeof getCatalog>>;
