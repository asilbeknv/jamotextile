import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireCustomer } from "@/server/auth/guards";
import { getCompanyOrder } from "@/server/services/orders";
import { getLookups } from "@/server/services/lookups";
import { acceptQuoteAction, customerMessageAction } from "@/server/actions/customer-orders";
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

export default async function CustomerOrderPage({ params }: Props) {
  const { number } = await params;
  const user = await requireCustomer();
  const order = await getCompanyOrder(user.company.id, number); // scoped: other companies' orders 404
  if (!order) notFound();
  const { colors, methods } = await getLookups();
  const ids = { orderId: order.id, number: order.number };

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{order.number}</span>
            <StageBadge stage={order.stage} />
            {order.isPaid && <Badge tone="ok">Оплачен</Badge>}
            {order.isSample && <Badge>Пробный образец</Badge>}
          </span>
        }
        subtitle={order.manager ? `Менеджер: ${order.manager.name}` : undefined}
        actions={<ButtonLink href="/portal/orders" size="sm">← Все заказы</ButtonLink>}
      />

      <div className="flex flex-col gap-6">
        <Card>
          <StageStepper stage={order.stage} />
        </Card>

        {order.stage === "QUOTE" && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/40 bg-accent-soft/40">
            <span className="font-medium">Коммерческое предложение готово. Проверьте состав и стоимость.</span>
            <ActionForm action={acceptQuoteAction} hidden={ids}>
              <SubmitButton variant="primary" size="sm" pendingLabel="Подтверждаем…">
                Подтвердить КП
              </SubmitButton>
            </ActionForm>
          </Card>
        )}
        {order.stage === "PAYMENT" && !order.isPaid && (
          <Card className="border-accent/40 bg-accent-soft/40">
            <p className="font-medium">Счёт выставлен. Онлайн-оплата через Payme и Click появится на следующем этапе — сейчас оплата по счёту.</p>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <OrderItems order={order} colors={colors} methods={methods} />
          <PriceSummary order={order} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Чат с менеджером" />
            <div className="flex flex-col gap-3">
              <MessageList order={order} viewer="CUSTOMER" />
              <ActionForm action={customerMessageAction} hidden={ids} resetOnSuccess>
                <div className="flex gap-2">
                  <input name="body" placeholder="Сообщение" maxLength={2000} className="field" aria-label="Сообщение" />
                  <SubmitButton variant="primary">Отправить</SubmitButton>
                </div>
              </ActionForm>
            </div>
          </Card>
          <Timeline order={order} />
        </div>
      </div>
    </>
  );
}
