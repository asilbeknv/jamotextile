import type { OrderStage } from "@prisma/client";
import { cn } from "@/lib/cn";
import { STAGE_FLOW, STAGE_LABEL, stageIndex, stageTone } from "@/domain/order-stages";
import { Badge } from "@/components/ui/badge";

export function StageBadge({ stage }: { stage: OrderStage }) {
  return <Badge tone={stageTone(stage)}>{STAGE_LABEL[stage]}</Badge>;
}

/** Horizontal order timeline with the "stitch" motif: done steps get a gold thread. */
export function StageStepper({ stage }: { stage: OrderStage }) {
  const current = stageIndex(stage);
  if (stage === "CANCELLED") return <p className="font-semibold text-bad">Заказ отменён</p>;
  return (
    <ol className="flex overflow-x-auto pb-1 pt-1.5">
      {STAGE_FLOW.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s} className={cn("relative min-w-[64px] flex-1 pt-5 text-center text-[11px]", done ? "text-ink" : now ? "font-bold text-accent" : "text-muted")}>
            <span className={cn("absolute inset-x-0 top-[6px] border-t-2", done || now ? "border-solid border-thread" : "border-dashed border-line")} />
            <span
              className={cn(
                "absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2",
                done && "border-thread bg-thread",
                now && "border-accent bg-accent ring-4 ring-accent-soft",
                !done && !now && "border-line bg-surface",
              )}
            />
            {STAGE_LABEL[s]}
          </li>
        );
      })}
    </ol>
  );
}
