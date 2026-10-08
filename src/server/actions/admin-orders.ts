"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guards";
import * as orders from "@/server/services/orders";
import { approveCompany } from "@/server/services/clients";

export type ActionResult = { ok: boolean; message?: string };

async function adminActor() {
  const a = await requireAdmin();
  return { type: "ADMIN" as const, id: a.id, name: a.name };
}

async function run(path: string, fn: () => Promise<unknown>, okMessage?: string): Promise<ActionResult> {
  try {
    await fn();
    revalidatePath(path);
    return { ok: true, message: okMessage };
  } catch (e) {
    if (e instanceof orders.DomainError) return { ok: false, message: e.message };
    throw e;
  }
}

const orderPath = (form: FormData) => `/admin/orders/${String(form.get("number"))}`;

export async function advanceOrderAction(_: ActionResult | null, form: FormData) {
  const actor = await adminActor();
  return run(orderPath(form), () => orders.advanceOrder(String(form.get("orderId")), actor), "Этап обновлён");
}

export async function togglePaidAction(_: ActionResult | null, form: FormData) {
  const actor = await adminActor();
  return run(orderPath(form), () => orders.setPaid(String(form.get("orderId")), form.get("paid") === "1", actor));
}

export async function assignWorkshopAction(_: ActionResult | null, form: FormData) {
  const actor = await adminActor();
  const ws = String(form.get("workshopId") ?? "");
  return run(orderPath(form), () => orders.assignWorkshop(String(form.get("orderId")), ws || null, actor), "Цех сохранён");
}

export async function cancelOrderAction(_: ActionResult | null, form: FormData) {
  const actor = await adminActor();
  return run(orderPath(form), () => orders.cancelOrder(String(form.get("orderId")), actor), "Заказ отменён");
}

export async function saveNoteAction(_: ActionResult | null, form: FormData) {
  await requireAdmin();
  const note = String(form.get("note") ?? "").slice(0, 2000);
  return run(orderPath(form), () => orders.updateInternalNote(String(form.get("orderId")), note), "Заметка сохранена");
}

export async function adminMessageAction(_: ActionResult | null, form: FormData) {
  const actor = await adminActor();
  const body = String(form.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return { ok: false, message: "Введите сообщение" };
  return run(orderPath(form), () => orders.postMessage(String(form.get("orderId")), { ...actor, name: "JAMO" }, body));
}

export async function approveCompanyAction(_: ActionResult | null, form: FormData) {
  const admin = await requireAdmin();
  return run("/admin/clients", () => approveCompany(String(form.get("companyId")), admin.id), "Компания подтверждена");
}
