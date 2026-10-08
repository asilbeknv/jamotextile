import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/guards";
import { getCatalog } from "@/server/services/catalog";
import { VAT_PCT } from "@/domain/pricing";
import { formatSum } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Каталог и цены" };

export default async function CatalogPage() {
  await requireAdmin();
  const { products, colors, methods, tiers } = await getCatalog();
  const colorName = new Map(colors.map((c) => [c.slug, c]));

  return (
    <>
      <PageHeader title="Каталог и цены" subtitle={`Цены в сумах без НДС (${VAT_PCT}%). Редактирование — следующий этап.`} />
      <div className="flex flex-col gap-6">
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-surface2 text-left text-[11px] uppercase tracking-wider text-muted">
                {["Изделие", "База", "Мин. тираж", "Срок", "Материал", "Цвета"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-3 py-2.5 font-semibold">{p.name}</td>
                  <td className="px-3 py-2.5 font-mono">{formatSum(p.basePrice)}</td>
                  <td className="px-3 py-2.5 font-mono">{p.minQty} шт</td>
                  <td className="px-3 py-2.5 font-mono">{p.leadDays} дн.</td>
                  <td className="px-3 py-2.5 text-muted">{p.fabric}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      {p.colors.map((c) => (
                        <span
                          key={c}
                          title={colorName.get(c)?.name}
                          className="h-4 w-4 rounded-full border border-line"
                          style={{ background: colorName.get(c)?.hex }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Способы нанесения" />
            <dl className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2">
              <dt className="text-xs text-muted" />
              <dd className="text-right text-xs text-muted">за шт</dd>
              <dd className="text-right text-xs text-muted">подготовка</dd>
              {methods.map((m) => (
                <div key={m.slug} className="contents">
                  <dt className="font-medium">{m.name}</dt>
                  <dd className="text-right font-mono">{formatSum(m.feePerUnit)}</dd>
                  <dd className="text-right font-mono">{formatSum(m.setupFee)}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Скидки за тираж" />
            <ul className="flex flex-col gap-2">
              {tiers.map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span>от {t.minQty} шт</span>
                  <span className="font-mono font-semibold">−{t.pct}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
