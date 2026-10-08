import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminDashboard } from "@/server/services/dashboard/admin";
import { formatCompactSum } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { KpiCard, KpiGrid } from "@/components/dashboard/kpi";
import { PipelineStrip } from "@/components/dashboard/pipeline-strip";
import { AttentionList } from "@/components/dashboard/attention-list";
import { WorkshopLoad } from "@/components/dashboard/workshop-load";
import { BarList } from "@/components/dashboard/bar-list";
import { OrderTable } from "@/components/orders/order-table";

export const metadata: Metadata = { title: "Дашборд" };

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const d = await getAdminDashboard();
  const delta = d.kpis.revenueDeltaPct;

  return (
    <>
      <PageHeader title={`Добрый день, ${admin.name.split(" ")[0]}`} subtitle="Сводка по заказам, клиентам и загрузке цехов." />
      <div className="flex flex-col gap-6">
        <KpiGrid>
          <KpiCard
            label="Выручка за месяц"
            value={formatCompactSum(d.kpis.revenue)}
            hint={delta === null ? "по новым заказам, с НДС" : `${delta >= 0 ? "+" : ""}${delta}% к прошлому месяцу`}
          />
          <KpiCard label="Открытые заказы" value={d.kpis.openOrders} hint={`${d.kpis.newOrders} новых в этом месяце`} href="/admin/orders" />
          <KpiCard label="В производстве" value={`${d.kpis.inProductionUnits} шт`} href="/admin/orders?stage=production" />
          <KpiCard label="Просрочено" value={d.kpis.overdue} tone={d.kpis.overdue ? "bad" : "ok"} />
        </KpiGrid>

        <Card>
          <CardHeader title="Воронка заказов" action={<Link href="/admin/orders" className="text-xs font-semibold text-accent">Все заказы →</Link>} />
          <PipelineStrip columns={d.pipeline} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Требует внимания" />
            <AttentionList items={d.attention} />
          </Card>
          <Card>
            <CardHeader title="Загрузка цехов" hint="Изделий в работе относительно месячной мощности" />
            <WorkshopLoad items={d.workshopLoad} />
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <h2 className="mb-3 text-[15px] font-medium">Последние заказы</h2>
            <OrderTable
              hrefBase="/admin/orders"
              rows={d.recentOrders.map((o) => ({ number: o.number, company: o.company, stage: o.stage, amount: o.amount, date: o.createdAt, dateLabel: "Создан" }))}
            />
          </section>
          <Card>
            <CardHeader title="Тираж по изделиям" hint="шт, все заказы" />
            {d.topProducts.length ? <BarList items={d.topProducts} /> : <EmptyState>Нет данных</EmptyState>}
          </Card>
        </div>
      </div>
    </>
  );
}
