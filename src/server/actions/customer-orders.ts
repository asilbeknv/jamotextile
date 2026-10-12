"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCustomer } from "@/server/auth/guards";
import * as orders from "@/server/services/orders";
import { SIZES } from "@/domain/catalog";
import type { ActionResult } from "./admin-orders";

async function customerActor() {
  const u = await requireCustomer();
  return { actor: { type: "CUSTOMER" as const, id: u.id, name: u.name }, companyId: u.company.id };
}

const SizeRow = z.object(
  Object.fromEntries(SIZES.map((s) => [s, z.number().int().min(0).max(100_000)])) as Record<(typeof SIZES)[number], z.ZodNumber>,
);

const ItemSchema = z.object({
  productSlug: z.string().min(1),
  colorSlug: z.string().min(1),
  placement: z.string().min(1),
  methodSlug: z.string().min(1),
  qty: z.number().int().min(0).max(100_000),
  sizes: z.object({ men: SizeRow, women: SizeRow }).nullable(),
});

const NewOrderSchema = z.object({
  items: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "bad json" });
        return z.NEVER;
      }
    })
    .pipe(z.array(ItemSchema).min(1).max(orders.MAX_ORDER_ITEMS)),
  isSample: z.literal("on").optional(),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(`${v}T00:00:00+05:00`) : null)),
  deliveryAddress: z.string().max(300).optional(),
  comment: z.string().max(2000).optional(),
});

/** Quantity is always recomputed from the size grid when one is sent. */
const itemQty = (i: z.infer<typeof ItemSchema>) =>
  i.sizes ? [...Object.values(i.sizes.men), ...Object.values(i.sizes.women)].reduce((a, b) => a + b, 0) : i.qty;

export type NewOrderState = { error?: string };

export async function createOrderAction(_: NewOrderState, form: FormData): Promise<NewOrderState> {
  const { actor, companyId } = await customerActor();
  const parsed = NewOrderSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Проверьте поля формы" };
  const d = parsed.data;

  let number: string;
  try {
    const order = await orders.createOrder(
      { id: actor.id, name: actor.name, companyId },
      {
        items: d.items.map((i) => ({
          productSlug: i.productSlug,
          colorSlug: i.colorSlug,
          placement: i.placement,
          methodSlug: i.methodSlug,
          qty: itemQty(i),
          sizes: i.sizes ?? undefined,
        })),
        isSample: d.isSample === "on",
        dueDate: d.dueDate,
        deliveryAddress: d.deliveryAddress?.trim() || null,
        comment: d.comment?.trim() || null,
      },
    );
    number = order.number;
  } catch (e) {
    if (e instanceof orders.DomainError) return { error: e.message };
    throw e;
  }
  revalidatePath("/portal");
  redirect(`/portal/orders/${number}`);
}

export async function acceptQuoteAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { actor, companyId } = await customerActor();
  try {
    await orders.advanceOrder(String(form.get("orderId")), actor, { companyId });
  } catch (e) {
    if (e instanceof orders.DomainError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath(`/portal/orders/${String(form.get("number"))}`);
  return { ok: true, message: "КП подтверждено. Счёт будет выставлен." };
}

export async function customerMessageAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { actor, companyId } = await customerActor();
  const body = String(form.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return { ok: false, message: "Введите сообщение" };
  try {
    await orders.postMessage(String(form.get("orderId")), actor, body, { companyId });
  } catch (e) {
    if (e instanceof orders.DomainError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath(`/portal/orders/${String(form.get("number"))}`);
  return { ok: true };
}
