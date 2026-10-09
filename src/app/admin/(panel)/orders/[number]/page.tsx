import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/guards";
import { getOrder } from "@/server/services/orders";
import { getLookups } from "@/server/services/lookups";
import { db } from "@/lib/db";
import {
  adminMessageAction,
  advanceOrderAction,
  assignWorkshopAction,
  cancelOrderAction,
  saveNoteAction,
  togglePaidAction,
} from "@/server/actions/admin-orders";
import { canAdvance, nextStage, STAGE_LABEL } from "@/domain/order-stages";
import { formatUzPhone } from "@/domain/phone";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { StageBadge, StageStepper } from "@/components/orders/stage";
import { ActionForm } from "@/components/orders/action-form";
import { MessageList, OrderItems, PriceSummary, Timeline } from "@/components/orders/order-parts";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Заказ ${(await params).number}` };
}

const ADVANCE_LABEL: Partial<Record<string, string>> = {
  MOCKUP: "Макет проверен — подготовить КП",
  QUOTE: "КП согласовано — выставить счёт",
  PAYMENT: "Передать в цех",
  PRODUCTION: "Производство завершено — в доставку",
  DELIVERY: "Доставлено — закрыть заказ",
};

export default async function AdminOrderPage({ params }: Props) {
  await requireAdmin();
  const { number } = await params;
  const order = await getOrder(number);
  if (!order) notFound();
  const [{ colors, methods }, workshops, company] = await Promise.all([
    getLookups(),
    db.workshop.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.company.findUniqueOrThrow({
      where: { id: order.companyId },
      select: { status: true, users: { where: { role: { in: ["HEAD", "BUYER"] } }, take: 1, select: { name: true, phone: true } } },
    }),
  ]);

  const ids = { orderId: order.id, number: order.number };
  const next = nextStage(order.stage);
  const check = canAdvance(order, "ADMIN");
  const closed = order.stage === "DONE" || order.stage === "CANCELLED";
  const contact = company.users[0];

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{order.number}</span>
            <StageBadge stage={order.stage} />
            {order.isPaid && <Badge tone="ok">Оплачен</Badge>}
            {order.isSample && <Badge>Образец</Badge>}
          </span>
        }
        subtitle={
          <>
            <Link href="/admin/clients" className="font-semibold text-ink hover:text-accent">
              {order.company.name}
            </Link>
            {contact && ` · ${contact.name}, ${formatUzPhone(contact.phone)}`}
            {company.status === "PENDING" && <span className="text-warn"> · компания не подтверждена</span>}
          </>
        }
        actions={<ButtonLink href="/admin/orders" size="sm">← Все заказы</ButtonLink>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <StageStepper stage={order.stage} />
          </Card>
          <div className="grid gap-6 xl:grid-cols-2">
            <OrderItems order={order} colors={colors} methods={methods} />
            <PriceSummary order={order} />
          </div>
          <Card>
            <CardHeader title="Чат с клиентом" />
            <div className="flex flex-col gap-3">
              <MessageList order={order} viewer="ADMIN" />
              <ActionForm action={adminMessageAction} hidden={ids} resetOnSuccess>
                <div className="flex gap-2">
                  <input name="body" placeholder="Ответ клиенту" maxLength={2000} className="field" aria-label="Сообщение" />
                  <SubmitButton variant="primary">Отправить</SubmitButton>
                </div>
              </ActionForm>
            </div>
          </Card>
          <Timeline order={order} />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader title="Действия" />
            <div className="flex flex-col gap-4">
              {order.stage === "PAYMENT" && (
                <>
                  <ActionForm action={togglePaidAction} hidden={{ ...ids, paid: order.isPaid ? "0" : "1" }}>
                    <SubmitButton size="sm">{order.isPaid ? "Снять отметку об оплате" : "Отметить оплату"}</SubmitButton>
                  </ActionForm>
                  <ActionForm action={assignWorkshopAction} hidden={ids}>
                    <label className="label">
                      Цех
                      <select name="workshopId" defaultValue={order.workshopId ?? ""} className="field">
                        <option value="">Не назначен</option>
                        {workshops.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SubmitButton size="sm">Сохранить цех</SubmitButton>
                  </ActionForm>
                </>
              )}
              {next && (
                <ActionForm action={advanceOrderAction} hidden={ids}>
                  <SubmitButton variant="primary" disabled={!check.ok} pendingLabel="Сохраняем…">
                    {ADVANCE_LABEL[order.stage] ?? `Этап выполнен → ${STAGE_LABEL[next]}`}
                  </SubmitButton>
                  {!check.ok && <p className="text-xs text-muted">{check.reason}</p>}
                </ActionForm>
              )}
              {order.workshop && order.stage !== "PAYMENT" && (
                <p className="text-xs text-muted">Цех: {order.workshop.name}</p>
              )}
              {!closed && (
                <ActionForm action={cancelOrderAction} hidden={ids}>
                  <SubmitButton variant="danger" size="sm" confirmMessage="Отменить заказ? Это действие нельзя отменить.">
                    Отменить заказ
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Внутренняя заметка" hint="Клиент её не видит" />
            <ActionForm action={saveNoteAction} hidden={ids}>
              <textarea name="note" rows={3} defaultValue={order.internalNote ?? ""} maxLength={2000} className="field" aria-label="Заметка" />
              <SubmitButton size="sm">Сохранить</SubmitButton>
            </ActionForm>
          </Card>
        </aside>
      </div>
    </>
  );
}
