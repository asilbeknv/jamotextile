import type { OrderStage } from "@prisma/client";

/** Order lifecycle, in the order the customer sees it. CANCELLED sits outside the flow. */
export const STAGE_FLOW: OrderStage[] = [
  "MOCKUP",
  "QUOTE",
  "PAYMENT",
  "CUTTING",
  "SEWING",
  "BRANDING",
  "QC",
  "PACKING",
  "DELIVERY",
  "DONE",
];

export const STAGE_LABEL: Record<OrderStage, string> = {
  MOCKUP: "Макет",
  QUOTE: "КП",
  PAYMENT: "Оплата",
  CUTTING: "Раскрой",
  SEWING: "Пошив",
  BRANDING: "Нанесение",
  QC: "ОТК",
  PACKING: "Упаковка",
  DELIVERY: "Доставка",
  DONE: "Закрыт",
  CANCELLED: "Отменён",
};

export const PRODUCTION_STAGES: OrderStage[] = ["CUTTING", "SEWING", "BRANDING", "QC", "PACKING"];

/** Groups used for the admin pipeline board and dashboard counters. */
export const PIPELINE_COLUMNS: { key: string; label: string; stages: OrderStage[] }[] = [
  { key: "new", label: "Новые заявки", stages: ["MOCKUP"] },
  { key: "quote", label: "КП", stages: ["QUOTE"] },
  { key: "payment", label: "Оплата", stages: ["PAYMENT"] },
  { key: "production", label: "В производстве", stages: PRODUCTION_STAGES },
  { key: "shipping", label: "Отгрузка", stages: ["DELIVERY"] },
  { key: "done", label: "Закрыты", stages: ["DONE"] },
];

export type StageTone = "neutral" | "accent" | "warn" | "ok" | "bad";

export function stageTone(stage: OrderStage): StageTone {
  if (stage === "DONE") return "ok";
  if (stage === "CANCELLED") return "bad";
  if (stage === "MOCKUP" || stage === "QUOTE" || stage === "PAYMENT") return "warn";
  return "accent";
}

export function stageIndex(stage: OrderStage): number {
  return STAGE_FLOW.indexOf(stage);
}

/** 0–100, for progress bars. Cancelled orders report 0. */
export function stageProgress(stage: OrderStage): number {
  const i = stageIndex(stage);
  return i < 0 ? 0 : Math.round((i / (STAGE_FLOW.length - 1)) * 100);
}

export function nextStage(stage: OrderStage): OrderStage | null {
  const i = stageIndex(stage);
  return i < 0 || i >= STAGE_FLOW.length - 1 ? null : STAGE_FLOW[i + 1];
}

export function isActive(stage: OrderStage): boolean {
  return stage !== "DONE" && stage !== "CANCELLED";
}

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

/**
 * Business rules for moving an order forward one step. Admins drive every
 * step; customers can only accept a quote (QUOTE → PAYMENT).
 */
export function canAdvance(
  order: { stage: OrderStage; isPaid: boolean; workshopId: string | null },
  actor: "ADMIN" | "CUSTOMER",
): TransitionCheck {
  const next = nextStage(order.stage);
  if (!next) return { ok: false, reason: "Заказ уже закрыт" };
  if (actor === "CUSTOMER" && order.stage !== "QUOTE") {
    return { ok: false, reason: "Это действие выполняет менеджер JAMO" };
  }
  if (order.stage === "PAYMENT") {
    if (!order.isPaid) return { ok: false, reason: "Передача в цех доступна после оплаты" };
    if (!order.workshopId) return { ok: false, reason: "Выберите цех" };
  }
  return { ok: true };
}
