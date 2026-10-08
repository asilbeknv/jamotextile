import Link from "next/link";
import { formatCompactSum } from "@/lib/format";

/** Order counts per pipeline column; each tile links to the filtered order list. */
export function PipelineStrip({ columns }: { columns: { key: string; label: string; count: number; amount: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {columns.map((c) => (
        <Link key={c.key} href={`/admin/orders?stage=${c.key}`} className="rounded-lg border border-line bg-surface2 p-3 hover:border-accent">
          <div className="text-xs font-semibold text-muted">{c.label}</div>
          <div className="mt-1 font-mono text-lg tabular-nums">{c.count}</div>
          <div className="text-[11px] text-muted">{formatCompactSum(c.amount)}</div>
        </Link>
      ))}
    </div>
  );
}
