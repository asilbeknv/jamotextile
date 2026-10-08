import "server-only";
import type { ActorType, OrderStage, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canAdvance, nextStage, STAGE_LABEL } from "@/domain/order-stages";
import { priceLine, VAT_PCT } from "@/domain/pricing";

export class DomainError extends Error {}

type Actor = { type: ActorType; id: string; name: string };

const listInclude = {
  company: { select: { id: true, name: true } },
  items: { include: { product: { select: { name: true, slug: true } } } },
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

export type NewOrderInput = {
  productSlug: string;
  colorSlug: string;
  placement: string;
  methodSlug: string;
  qty: number;
  sizes?: Prisma.InputJsonValue;
  isSample: boolean;
  dueDate: Date | null;
  deliveryAddress: string | null;
  comment: string | null;
};

export async function createOrder(customer: { id: string; name: string; companyId: string }, input: NewOrderInput) {
  const [company, product, method, tiers] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: customer.companyId } }),
    db.product.findUnique({ where: { slug: input.productSlug } }),
    db.decorationMethod.findUnique({ where: { slug: input.methodSlug } }),
    db.discountTier.findMany(),
  ]);
  if (!product?.isActive) throw new DomainError("Изделие недоступно");
  if (!method?.isActive) throw new DomainError("Способ нанесения недоступен");
  if (!product.colors.includes(input.colorSlug)) throw new DomainError("Цвет недоступен для этого изделия");
  if (!product.placements.includes(input.placement)) throw new DomainError("Место нанесения недоступно");
  const qty = input.isSample ? 1 : input.qty;
  if (!input.isSample && qty < product.minQty) throw new DomainError(`Минимальный тираж: ${product.minQty} шт`);

  const price = priceLine({
    basePrice: product.basePrice,
    qty,
    feePerUnit: method.feePerUnit,
    setupFee: method.setupFee,
    tiers,
    companyDiscountPct: company.discountPct,
  });
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
          netAmount: price.lineTotal,
          vatPct: VAT_PCT,
          items: {
            create: {
              productId: product.id,
              colorSlug: input.colorSlug,
              placement: input.placement,
              methodSlug: method.slug,
              qty,
              sizes: product.sized && !input.isSample ? input.sizes : undefined,
              ...price,
            },
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
