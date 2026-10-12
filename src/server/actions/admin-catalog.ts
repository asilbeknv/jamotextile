"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/guards";
import { updateProduct } from "@/server/services/catalog";
import type { ActionResult } from "./admin-orders";

const ProductSchema = z.object({
  productId: z.string().min(1),
  basePrice: z.coerce.number().int("Цена — целое число").min(1_000, "Цена от 1 000 сум").max(100_000_000, "Слишком большая цена"),
  minQty: z.coerce.number().int("Тираж — целое число").min(1, "Минимум 1 шт").max(100_000, "Слишком большой тираж"),
  fabric: z.string().trim().min(2, "Укажите материал").max(120, "Материал — до 120 символов"),
});

/** Owner-only: edit a product's base price, minimum order quantity and material. */
export async function updateProductAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") return { ok: false, message: "Менять каталог может только владелец" };

  const parsed = ProductSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const { productId, ...data } = parsed.data;

  const product = await updateProduct(productId, data).catch(() => null);
  if (!product) return { ok: false, message: "Изделие не найдено" };

  revalidatePath("/admin/catalog");
  revalidatePath("/portal/orders/new");
  return { ok: true, message: `${product.name}: сохранено` };
}
