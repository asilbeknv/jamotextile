import "server-only";
import type { ActorType, OrderStage, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canAdvance, nextStage, STAGE_LABEL } from "@/domain/order-stages";
import { priceOrder, VAT_PCT } from "@/domain/pricing";

export class DomainError extends Error {}

type Actor = { type: ActorType; id: string; name: string };

const listInclude = {
  company: { select: { id: true, name: true } },
  items: { include: { product: { select: { name: true, slug: true } } }, orderBy: { id: "asc" } },
} satisfies Prisma.OrderInclude;

const detailInclude = {
  ...listInclude,
  manager: { select: { id: true, name: true } },
  workshop: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  events: { orderBy: { createdAt: "desc" } },
  messages: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export type OrderListItem = Prisma.OrderGetPayload<{ include: typeof listInclude }>;
export type OrderDetail = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

// ───────────── Customer-scoped reads (always filtered by companyId) ─────────────

export function listCompanyOrders(companyId: string) {
  return db.order.findMany({ where: { companyId }, include: listInclude, orderBy: { createdAt: "desc" } });
}

export function getCompanyOrder(companyId: string, number: string) {
  return db.order.findFirst({ where: { companyId, number }, include: detailInclude });
}

// ───────────── Admin reads ─────────────

export function listAllOrders(filter: { stages?: OrderStage[]; q?: string } = {}) {
  const where: Prisma.OrderWhereInput = {};
  if (filter.stages?.length) where.stage = { in: filter.stages };
  if (filter.q) {
    where.OR = [
      { number: { contains: filter.q, mode: "insensitive" } },
      { company: { name: { contains: filter.q, mode: "insensitive" } } },
    ];
  }
  return db.order.findMany({ where, include: listInclude, orderBy: { createdAt: "desc" }, take: 200 });
}

export function getOrder(number: string) {
  return db.order.findUnique({ where: { number }, include: detailInclude });
}

// ───────────── Writes ─────────────

function logEvent(tx: Prisma.TransactionClient, orderId: string, actor: Actor, message: string) {
  return tx.orderEvent.create({
    data: { orderId, actorType: actor.type, actorId: actor.id, actorName: actor.name, message },
  });
}

async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const [row] = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("number" FROM 3) AS INTEGER)) AS max FROM "Order" WHERE "number" ~ '^O-[0-9]+$'`;
  return `O-${(row?.max ?? 2000) + 1}`;
}

export const MAX_ORDER_ITEMS = 20;

export type NewOrderItemInput = {
  productSlug: string;
  colorSlug: string;
  placement: string;
  methodSlug: string;
  qty: number;
  sizes?: Prisma.InputJsonValue;
};

export type NewOrderInput = {
  items: NewOrderItemInput[];
  isSample: boolean;
  dueDate: Date | null;
  deliveryAddress: string | null;
  comment: string | null;
};

/**
 * Creates an order with one or more items. Every item is validated against
 * the catalog; prices are computed here (never taken from the client) with the
 * volume tier based on the order's total quantity.
 */
export async function createOrder(customer: { id: string; name: string; companyId: string }, input: NewOrderInput) {
  if (input.items.length === 0) throw new DomainError("Добавьте хотя бы одно изделие");
  if (input.items.length > MAX_ORDER_ITEMS) throw new DomainError(`Не больше ${MAX_ORDER_ITEMS} позиций в одном заказе`);

  const [company, products, methods, tiers] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: customer.companyId } }),
    db.product.findMany({ where: { slug: { in: input.items.map((i) => i.productSlug) }, isActive: true } }),
    db.decorationMethod.findMany({ where: { slug: { in: input.items.map((i) => i.methodSlug) }, isActive: true } }),
    db.discountTier.findMany(),
  ]);
  const productBySlug = new Map(products.map((p) => [p.slug, p]));
  const methodBySlug = new Map(methods.map((m) => [m.slug, m]));

  const lines = input.items.map((item, i) => {
    const n = input.items.length > 1 ? ` (позиция ${i + 1})` : "";
    const product = productBySlug.get(item.productSlug);
    const method = methodBySlug.get(item.methodSlug);
    if (!product) throw new DomainError(`Изделие недоступно${n}`);
    if (!method) throw new DomainError(`Способ нанесения недоступен${n}`);
    if (!product.colors.includes(item.colorSlug)) throw new DomainError(`${product.name}: цвет недоступен`);
    if (!product.placements.includes(item.placement)) throw new DomainError(`${product.name}: место нанесения недоступно`);
    const qty = input.isSample ? 1 : item.qty;
    if (!input.isSample && qty < product.minQty) throw new DomainError(`${product.name}: минимальный тираж ${product.minQty} шт`);
    return { item, product, method, qty };
  });

  const priced = priceOrder(
    lines.map((l) => ({ basePrice: l.product.basePrice, qty: l.qty, feePerUnit: l.method.feePerUnit, setupFee: l.method.setupFee })),
    tiers,
    company.discountPct,
  );
  const actor: Actor = { type: "CUSTOMER", id: customer.id, name: customer.name };

  // Serializable so two simultaneous orders cannot take the same number.
  return db.$transaction(
    async (tx) => {
      const order = await tx.order.create({
        data: {
          number: await nextOrderNumber(tx),
          companyId: company.id,
          createdById: customer.id,
          managerId: company.managerId,
          isSample: input.isSample,
          dueDate: input.dueDate,
          deliveryAddress: input.deliveryAddress,
          netAmount: priced.net,
          vatPct: VAT_PCT,
          items: {
            create: lines.map((l, i) => ({
              productId: l.product.id,
              colorSlug: l.item.colorSlug,
              placement: l.item.placement,
              methodSlug: l.method.slug,
              qty: l.qty,
              sizes: l.product.sized && !input.isSample ? l.item.sizes : undefined,
              ...priced.lines[i],
            })),
          },
        },
      });
      await logEvent(tx, order.id, actor, "Заявка создана клиентом");
      if (input.comment) {
        await tx.orderMessage.create({
          data: { orderId: order.id, authorType: "CUSTOMER", authorId: customer.id, authorName: customer.name, body: input.comment },
        });
      }
      return order;
    },
    { isolationLevel: "Serializable" },
  );
}

/** Moves an order one step forward, enforcing domain rules for the actor. */
export async function advanceOrder(orderId: string, actor: Actor, scope?: { companyId: string }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, ...(scope && { companyId: scope.companyId }) } });
    if (!order) throw new DomainError("Заказ не найден");
    const check = canAdvance(order, actor.type === "CUSTOMER" ? "CUSTOMER" : "ADMIN");
    if (!check.ok) throw new DomainError(check.reason);
    const to = nextStage(order.stage)!;
    // Optimistic guard: only update if nobody moved it meanwhile.
    const { count } = await tx.order.updateMany({ where: { id: order.id, stage: order.stage }, data: { stage: to } });
    if (count === 0) throw new DomainError("Заказ уже изменён, обновите страницу");
    const message =
      actor.type === "CUSTOMER" && order.stage === "QUOTE" ? "КП подтверждено клиентом" : `Этап: ${STAGE_LABEL[to]}`;
    await logEvent(tx, order.id, actor, message);
    return to;
  });
}

export async function setPaid(orderId: string, paid: boolean, actor: Actor) {
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { isPaid: paid, paidAt: paid ? new Date() : null } });
    await logEvent(tx, orderId, actor, paid ? "Оплата получена" : "Отметка об оплате снята");
  });
}

export async function assignWorkshop(orderId: string, workshopId: string | null, actor: Actor) {
  await db.$transaction(async (tx) => {
    const ws = workshopId ? await tx.workshop.findUnique({ where: { id: workshopId } }) : null;
    await tx.order.update({ where: { id: orderId }, data: { workshopId: ws?.id ?? null } });
    await logEvent(tx, orderId, actor, ws ? `Назначен цех: ${ws.name}` : "Цех снят");
  });
}

export async function cancelOrder(orderId: string, actor: Actor) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.stage === "DONE" || order.stage === "CANCELLED") throw new DomainError("Заказ уже закрыт");
    await tx.order.update({ where: { id: orderId }, data: { stage: "CANCELLED" } });
    await logEvent(tx, orderId, actor, "Заказ отменён");
  });
}

export async function updateInternalNote(orderId: string, note: string) {
  await db.order.update({ where: { id: orderId }, data: { internalNote: note || null } });
}

export async function postMessage(orderId: string, actor: Actor, body: string, scope?: { companyId: string }) {
  const order = await db.order.findFirst({ where: { id: orderId, ...(scope && { companyId: scope.companyId }) } });
  if (!order) throw new DomainError("Заказ не найден");
  await db.orderMessage.create({
    data: { orderId, authorType: actor.type, authorId: actor.id, authorName: actor.name, body },
  });
}
