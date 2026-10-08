import { cn } from "@/lib/cn";

export function Progress({ value, tone = "accent", label }: { value: number; tone?: "accent" | "warn" | "bad"; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 overflow-hidden rounded-full border border-line bg-surface2"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full", tone === "accent" && "bg-accent", tone === "warn" && "bg-thread", tone === "bad" && "bg-bad")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
