import { cn } from "@/lib/cn";
import type { StageTone } from "@/domain/order-stages";

const tones: Record<StageTone, string> = {
  neutral: "bg-surface2 text-muted border border-line",
  accent: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn",
  ok: "bg-ok-soft text-ok",
  bad: "bg-bad-soft text-bad",
};

export function Badge({ tone = "neutral", className, children }: { tone?: StageTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
