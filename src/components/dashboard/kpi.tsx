import Link from "next/link";
import { cn } from "@/lib/cn";

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function KpiCard({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "warn" | "bad" | "ok";
  href?: string;
}) {
  const body = (
    <>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div
        className={cn(
          "mt-1.5 whitespace-nowrap font-mono text-lg font-medium tabular-nums sm:text-2xl",
          tone === "warn" && "text-warn",
          tone === "bad" && "text-bad",
          tone === "ok" && "text-ok",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </>
  );
  const cls = "block min-w-0 rounded-xl border border-line bg-surface p-4";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-accent")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
