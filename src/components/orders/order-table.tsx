import Link from "next/link";
import type { OrderStage } from "@prisma/client";
import { formatDate, formatSum } from "@/lib/format";
import { StageBadge } from "./stage";

export type OrderRow = {
  number: string;
  company?: string;
  summary?: string;
  stage: OrderStage;
  amount: number;
  date: Date | null;
  dateLabel?: string;
};

/** Responsive order list: table on wide screens, stacked rows on phones. */
export function OrderTable({ rows, hrefBase }: { rows: OrderRow[]; hrefBase: string }) {
  const showCompany = rows.some((r) => r.company);
  const showSummary = rows.some((r) => r.summary);
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="bg-surface2 text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="px-3 py-2.5 font-semibold">Заказ</th>
            {showCompany && <th className="px-3 py-2.5 font-semibold">Компания</th>}
            {showSummary && <th className="px-3 py-2.5 font-semibold">Состав</th>}
            <th className="px-3 py-2.5 font-semibold">Этап</th>
            <th className="px-3 py-2.5 text-right font-semibold">Сумма</th>
            <th className="px-3 py-2.5 font-semibold">{rows[0]?.dateLabel ?? "Дата"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.number} className="border-t border-line hover:bg-surface2/60">
              <td className="whitespace-nowrap px-3 py-2.5">
                <Link href={`${hrefBase}/${r.number}`} className="font-mono font-medium text-accent hover:underline">
                  {r.number}
                </Link>
              </td>
              {showCompany && <td className="px-3 py-2.5 font-medium">{r.company}</td>}
              {showSummary && <td className="max-w-[260px] truncate px-3 py-2.5 text-muted">{r.summary}</td>}
              <td className="px-3 py-2.5">
                <StageBadge stage={r.stage} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums">{formatSum(r.amount)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted">{formatDate(r.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
