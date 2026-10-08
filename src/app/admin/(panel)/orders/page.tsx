import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/guards";
import { listAllOrders } from "@/server/services/orders";
import { PIPELINE_COLUMNS } from "@/domain/order-stages";
import { grossAmount } from "@/domain/pricing";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/card";
import { OrderTable } from "@/components/orders/order-table";

export const metadata: Metadata = { title: "Заказы" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ stage?: string; q?: string }> }) {
  await requireAdmin();
  const { stage, q } = await searchParams;
  const column = PIPELINE_COLUMNS.find((c) => c.key === stage);
  const orders = await listAllOrders({ stages: column?.stages, q: q?.trim() || undefined });
  const tabs = [{ key: undefined, label: "Все" }, ...PIPELINE_COLUMNS.map((c) => ({ key: c.key, label: c.label }))];

  return (
    <>
      <PageHeader title="Заказы" subtitle="Нажмите на номер, чтобы проверить макет, выставить счёт или передать заказ в цех." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Фильтр по этапу">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={{ pathname: "/admin/orders", query: { ...(t.key && { stage: t.key }), ...(q && { q }) } }}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 font-medium",
                stage === t.key || (!stage && !t.key) ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2">
          {stage && <input type="hidden" name="stage" value={stage} />}
          <input name="q" defaultValue={q} placeholder="Номер или компания" className="field sm:w-56" aria-label="Поиск" />
        </form>
      </div>
      {orders.length === 0 ? (
        <EmptyState>Заказов не найдено.</EmptyState>
      ) : (
        <OrderTable
          hrefBase="/admin/orders"
          rows={orders.map((o) => ({
            number: o.number,
            company: o.company.name,
            summary: o.items.map((i) => `${i.product.name} ×${i.qty}`).join(", "),
            stage: o.stage,
            amount: grossAmount(o.netAmount, o.vatPct),
            date: o.dueDate,
            dateLabel: "Срок",
          }))}
        />
      )}
    </>
  );
}
