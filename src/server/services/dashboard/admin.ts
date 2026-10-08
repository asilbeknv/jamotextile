import "server-only";
import { db } from "@/lib/db";
import { PIPELINE_COLUMNS, PRODUCTION_STAGES } from "@/domain/order-stages";
import { grossAmount } from "@/domain/pricing";

/**
 * View model for the admin dashboard. One function = one round of queries;
 * widgets receive plain data and never touch the database themselves.
 */
export async function getAdminDashboard(now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [orders, pendingCompanies, workshops, products] = await Promise.all([
    db.order.findMany({
      where: { stage: { not: "CANCELLED" } },
      select: {
        id: true,
        number: true,
        stage: true,
        isPaid: true,
        workshopId: true,
        netAmount: true,
        vatPct: true,
        dueDate: true,
        createdAt: true,
        company: { select: { name: true } },
        items: { select: { qty: true, productId: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.company.findMany({ where: { status: "PENDING" }, select: { id: true, name: true, createdAt: true } }),
    db.workshop.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ select: { id: true, name: true } }),
  ]);

  const gross = (o: (typeof orders)[number]) => grossAmount(o.netAmount, o.vatPct);
  const qtyOf = (o: (typeof orders)[number]) => o.items.reduce((a, i) => a + i.qty, 0);
  const isOpen = (o: (typeof orders)[number]) => o.stage !== "DONE";

  const thisMonth = orders.filter((o) => o.createdAt >= monthStart);
  const lastMonth = orders.filter((o) => o.createdAt >= prevMonthStart && o.createdAt < monthStart);
  const revenue = thisMonth.reduce((a, o) => a + gross(o), 0);
  const revenuePrev = lastMonth.reduce((a, o) => a + gross(o), 0);
  const overdue = orders.filter((o) => isOpen(o) && o.dueDate && o.dueDate < now);
  const readyToHandOff = orders.filter((o) => o.stage === "PAYMENT" && o.isPaid);
  const inProduction = orders.filter((o) => PRODUCTION_STAGES.includes(o.stage));

  const pipeline = PIPELINE_COLUMNS.map((col) => {
    const list = orders.filter((o) => col.stages.includes(o.stage));
    return { key: col.key, label: col.label, count: list.length, amount: list.reduce((a, o) => a + gross(o), 0) };
  });

  const workshopLoad = workshops.map((w) => {
    const load = inProduction.filter((o) => o.workshopId === w.id).reduce((a, o) => a + qtyOf(o), 0);
    return { id: w.id, name: w.name, load, capacity: w.capacityPerMonth };
  });

  const unitsByProduct = new Map<string, number>();
  for (const o of orders) for (const i of o.items) unitsByProduct.set(i.productId, (unitsByProduct.get(i.productId) ?? 0) + i.qty);
  const topProducts = products
    .map((p) => ({ label: p.name, value: unitsByProduct.get(p.id) ?? 0 }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

  const attention = [
    ...pendingCompanies.map((c) => ({
      kind: "company" as const,
      href: "/admin/clients",
      title: c.name,
      detail: "Новая компания ждёт подтверждения",
    })),
    ...readyToHandOff.map((o) => ({
      kind: "handoff" as const,
      href: `/admin/orders/${o.number}`,
      title: `${o.number} · ${o.company.name}`,
      detail: "Оплачен — передайте в цех",
    })),
    ...overdue.map((o) => ({
      kind: "overdue" as const,
      href: `/admin/orders/${o.number}`,
      title: `${o.number} · ${o.company.name}`,
      detail: "Срок прошёл",
    })),
  ];

  return {
    kpis: {
      revenue,
      revenueDeltaPct: revenuePrev ? Math.round(((revenue - revenuePrev) / revenuePrev) * 100) : null,
      newOrders: thisMonth.length,
      openOrders: orders.filter(isOpen).length,
      inProductionUnits: inProduction.reduce((a, o) => a + qtyOf(o), 0),
      overdue: overdue.length,
    },
    pipeline,
    attention,
    workshopLoad,
    topProducts,
    recentOrders: orders.slice(0, 6).map((o) => ({
      number: o.number,
      company: o.company.name,
      stage: o.stage,
      amount: gross(o),
      createdAt: o.createdAt,
    })),
  };
}

export type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
