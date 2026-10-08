import type { Metadata } from "next";
import { requireCustomer } from "@/server/auth/guards";
import { getCatalog } from "@/server/services/catalog";
import { getCompanyProfile } from "@/server/services/clients";
import { PageHeader } from "@/components/ui/page-header";
import { NewOrderForm } from "./new-order-form";

export const metadata: Metadata = { title: "Новый заказ" };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireCustomer();
  const [{ product }, catalog, company] = await Promise.all([searchParams, getCatalog(), getCompanyProfile(user.company.id)]);
  return (
    <>
      <PageHeader title="Новый заказ" subtitle="Выберите изделие, нанесение и тираж. Менеджер проверит макет и пришлёт КП." />
      <NewOrderForm
        catalog={{
          products: catalog.products.map((p) => ({
            slug: p.slug,
            name: p.name,
            basePrice: p.basePrice,
            minQty: p.minQty,
            leadDays: p.leadDays,
            fabric: p.fabric,
            sized: p.sized,
            placements: p.placements,
            colors: p.colors,
          })),
          colors: catalog.colors,
          methods: catalog.methods.map((m) => ({ slug: m.slug, name: m.name, feePerUnit: m.feePerUnit, setupFee: m.setupFee })),
          tiers: catalog.tiers.map((t) => ({ minQty: t.minQty, pct: t.pct })),
        }}
        companyDiscountPct={company.discountPct}
        addresses={company.addresses.map((a) => a.address)}
        initialProduct={product}
      />
    </>
  );
}
