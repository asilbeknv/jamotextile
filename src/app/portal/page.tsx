import Link from "next/link";
import type { Metadata } from "next";
import { requireCustomer } from "@/server/auth/guards";
import { getCustomerDashboard } from "@/server/services/dashboard/customer";
import { formatCompactSum, formatDate, formatSum } from "@/lib/format";
import { stageProgress } from "@/domain/order-stages";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { KpiCard, KpiGrid } from "@/components/dashboard/kpi";
import { StageBadge } from "@/components/orders/stage";

export const metadata: Metadata = { title: "Главная" };

export default async function CustomerDashboardPage() {
  const user = await requireCustomer();
  const d = await getCustomerDashboard(user.company.id);

  return (
    <>
      <PageHeader
        title={d.company.name}
        subtitle={`Ваш менеджер: ${d.company.manager?.name ?? "назначается"}`}
        actions={
          <ButtonLink href="/portal/orders/new" variant="primary">
            Новый заказ
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-6">
        <KpiGrid>
          <KpiCard label="Заказы в работе" value={d.kpis.active} href="/portal/orders" />
          <KpiCard label="На производстве" value={d.kpis.inProduction} />
          <KpiCard label="Ждут вашего решения" value={d.kpis.needsAction} tone={d.kpis.needsAction ? "warn" : undefined} />
          <KpiCard label="Оплачено в этом году" value={formatCompactSum(d.kpis.spentThisYear)} />
        </KpiGrid>

        {d.needsAction.length > 0 && (
          <Card className="border-warn/40">
            <CardHeader title="Нужно ваше действие" />
            <ul className="divide-y divide-line">
              {d.needsAction.map((o) => (
                <li key={o.number} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="font-mono font-medium">{o.number}</span> · {o.summary}
                    <span className="block text-xs text-muted">
                      {o.action === "quote" ? "Коммерческое предложение готово" : "Ожидаем оплату по счёту"} · {formatSum(o.amount)}
                    </span>
                  </span>
                  <ButtonLink href={`/portal/orders/${o.number}`} size="sm" variant="primary">
                    {o.action === "quote" ? "Посмотреть КП" : "К оплате"}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader title="Заказы в работе" action={<Link href="/portal/orders" className="text-xs font-semibold text-accent">Все заказы →</Link>} />
            {d.activeOrders.length === 0 ? (
              <EmptyState>Активных заказов нет. Начните с нового макета.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-4">
                {d.activeOrders.map((o) => (
                  <li key={o.number}>
                    <Link href={`/portal/orders/${o.number}`} className="group flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-medium text-accent group-hover:underline">{o.number}</span>
                        <StageBadge stage={o.stage} />
                      </div>
                      <div className="truncate">{o.summary}</div>
                      <Progress value={stageProgress(o.stage)} label={`Прогресс ${o.number}`} />
                      <div className="text-xs text-muted">
                        Срок {formatDate(o.dueDate)} · {formatSum(o.amount)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Пора обновить форму" hint={`Напоминаем, если позицию не заказывали ${d.company.reminderMonths}+ мес.`} />
            {d.reorder.length === 0 ? (
              <p className="text-muted">Все позиции заказывались недавно.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {d.reorder.map((r) => (
                  <li key={r.slug} className="flex flex-col gap-1.5">
                    <b>{r.product}</b>
                    <span className="text-xs text-muted">
                      Последний заказ {formatDate(r.date)} · {r.qty} шт · {r.months.toFixed(1).replace(".", ",")} мес. назад
                    </span>
                    <ButtonLink href={`/portal/orders/new?product=${r.slug}`} size="sm" className="self-start">
                      Повторить заказ
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
