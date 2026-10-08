import type { Metadata } from "next";
import { requireCustomer } from "@/server/auth/guards";
import { listCompanyOrders } from "@/server/services/orders";
import { grossAmount } from "@/domain/pricing";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { OrderTable } from "@/components/orders/order-table";

export const metadata: Metadata = { title: "Заказы" };

export default async function CustomerOrdersPage() {
  const user = await requireCustomer();
  const orders = await listCompanyOrders(user.company.id);
  return (
    <>
      <PageHeader
        title="Заказы"
        actions={
          <ButtonLink href="/portal/orders/new" variant="primary">
            Новый заказ
          </ButtonLink>
        }
      />
      {orders.length === 0 ? (
        <EmptyState>Заказов пока нет.</EmptyState>
      ) : (
        <OrderTable
          hrefBase="/portal/orders"
          rows={orders.map((o) => ({
            number: o.number,
            summary: o.items.map((i) => `${i.product.name} ×${i.qty}`).join(", "),
            stage: o.stage,
            amount: grossAmount(o.netAmount, o.vatPct),
            date: o.createdAt,
            dateLabel: "Создан",
          }))}
        />
      )}
    </>
  );
}
