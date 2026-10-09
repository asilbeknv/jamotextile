import "server-only";
import { db } from "@/lib/db";
import { isActive } from "@/domain/order-stages";
import { grossAmount } from "@/domain/pricing";

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.44;

/** View model for the customer dashboard. Every query is scoped to `companyId`. */
export async function getCustomerDashboard(companyId: string, now = new Date()) {
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [company, orders] = await Promise.all([
    db.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true, status: true, reminderMonths: true, manager: { select: { name: true } } },
    }),
    db.order.findMany({
      where: { companyId, stage: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        number: true,
        stage: true,
        isPaid: true,
        isSample: true,
        netAmount: true,
        vatPct: true,
        dueDate: true,
        createdAt: true,
        items: { select: { qty: true, colorSlug: true, product: { select: { slug: true, name: true } } } },
      },
    }),
  ]);

  const active = orders.filter((o) => isActive(o.stage));
  const needsAction = active.filter((o) => o.stage === "QUOTE" || (o.stage === "PAYMENT" && !o.isPaid));

  // Reorder reminders: latest non-sample order per product older than the company's period.
  const lastByProduct = new Map<string, { product: string; slug: string; qty: number; date: Date; number: string }>();
  for (const o of orders) {
    if (o.isSample) continue;
    for (const i of o.items) {
      if (!lastByProduct.has(i.product.slug)) {
        lastByProduct.set(i.product.slug, { product: i.product.name, slug: i.product.slug, qty: i.qty, date: o.createdAt, number: o.number });
      }
    }
  }
  const reorder = [...lastByProduct.values()]
    .map((x) => ({ ...x, months: (now.getTime() - x.date.getTime()) / MONTH_MS }))
    .filter((x) => x.months >= company.reminderMonths)
    .sort((a, b) => b.months - a.months);

  const describe = (o: (typeof orders)[number]) => o.items.map((i) => `${i.product.name} ×${i.qty}`).join(", ");

  return {
    company,
    kpis: {
      active: active.length,
      inProduction: active.filter((o) => o.stage === "PRODUCTION").length,
      needsAction: needsAction.length,
      spentThisYear: orders
        .filter((o) => o.createdAt >= yearStart && o.isPaid)
        .reduce((a, o) => a + grossAmount(o.netAmount, o.vatPct), 0),
    },
    needsAction: needsAction.map((o) => ({
      number: o.number,
      summary: describe(o),
      amount: grossAmount(o.netAmount, o.vatPct),
      action: o.stage === "QUOTE" ? ("quote" as const) : ("payment" as const),
    })),
    activeOrders: active.map((o) => ({
      number: o.number,
      stage: o.stage,
      summary: describe(o),
      dueDate: o.dueDate,
      amount: grossAmount(o.netAmount, o.vatPct),
    })),
    reorder,
  };
}

export type CustomerDashboard = Awaited<ReturnType<typeof getCustomerDashboard>>;
