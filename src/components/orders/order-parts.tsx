import type { OrderDetail } from "@/server/services/orders";
import { PLACEMENT_LABEL, SIZES } from "@/domain/catalog";
import { grossAmount, vatAmount } from "@/domain/pricing";
import { formatDate, formatDateTime, formatSum } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Colors = Map<string, { name: string; hex: string }>;
type Methods = Map<string, string>;

export function OrderItems({ order, colors, methods }: { order: OrderDetail; colors: Colors; methods: Methods }) {
  return (
    <Card>
      <CardHeader title="Состав заказа" />
      <ul className="flex flex-col gap-4">
        {order.items.map((it) => {
          const color = colors.get(it.colorSlug);
          const sizes = it.sizes as { men?: Record<string, number>; women?: Record<string, number> } | null;
          return (
            <li key={it.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 flex-none rounded-full border border-line" style={{ background: color?.hex }} aria-hidden />
                <div className="min-w-0">
                  <b>{it.product.name}</b> · {color?.name ?? it.colorSlug}
                  <div className="text-xs text-muted">
                    {PLACEMENT_LABEL[it.placement] ?? it.placement} · {methods.get(it.methodSlug) ?? it.methodSlug} · {it.qty} шт ·{" "}
                    {formatSum(it.unitPrice)}/шт{it.discountPct ? ` (скидка ${it.discountPct}%)` : ""}
                  </div>
                </div>
              </div>
              {sizes?.men && (
                <div className="overflow-x-auto">
                  <table className="text-center text-xs">
                    <thead>
                      <tr className="text-muted">
                        <th className="px-2 py-1" />
                        {SIZES.map((s) => (
                          <th key={s} className="px-2 py-1 font-semibold">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {(
                        [
                          ["Муж.", sizes.men],
                          ["Жен.", sizes.women],
                        ] as const
                      ).map(([label, row]) => (
                        <tr key={label}>
                          <td className="px-2 py-1 text-left font-sans text-muted">{label}</td>
                          {SIZES.map((s) => (
                            <td key={s} className="px-2 py-1">
                              {row?.[s] ?? 0}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function PriceSummary({ order }: { order: OrderDetail }) {
  const setup = order.items.reduce((a, i) => a + i.setupFee, 0);
  return (
    <Card>
      <CardHeader title="Стоимость" />
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
        <dt className="text-muted">Подготовка к нанесению</dt>
        <dd className="text-right font-mono">{formatSum(setup)}</dd>
        <dt className="text-muted">Сумма без НДС</dt>
        <dd className="text-right font-mono">{formatSum(order.netAmount)}</dd>
        <dt className="text-muted">НДС {order.vatPct}%</dt>
        <dd className="text-right font-mono">{formatSum(vatAmount(order.netAmount, order.vatPct))}</dd>
        <dt className="font-bold">Итого</dt>
        <dd className="text-right font-mono text-base font-bold">{formatSum(grossAmount(order.netAmount, order.vatPct))}</dd>
      </dl>
      <p className="mt-3 text-xs text-muted">
        Срок: {formatDate(order.dueDate)}
        {order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}
      </p>
    </Card>
  );
}

export function Timeline({ order }: { order: OrderDetail }) {
  return (
    <Card>
      <CardHeader title="История" />
      <ul className="flex flex-col gap-1.5">
        {order.events.map((e) => (
          <li key={e.id} className="text-sm">
            <span className="font-mono text-xs text-muted">{formatDateTime(e.createdAt)}</span> {e.message}
            {e.actorName && <span className="text-xs text-muted"> · {e.actorName}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Messages, aligned right for the viewer's own side. */
export function MessageList({ order, viewer }: { order: OrderDetail; viewer: "ADMIN" | "CUSTOMER" }) {
  if (!order.messages.length) return <p className="text-sm text-muted">Сообщений пока нет.</p>;
  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {order.messages.map((m) => {
        const mine = m.authorType === viewer;
        return (
          <li
            key={m.id}
            className={cn(
              "max-w-[85%] rounded-xl border px-3 py-2",
              mine ? "self-end border-transparent bg-accent-soft" : "self-start border-line bg-surface2",
            )}
          >
            <span className="block text-[11px] text-muted">
              {m.authorType === "ADMIN" ? "JAMO" : m.authorName} · {formatDateTime(m.createdAt)}
            </span>
            {m.body}
          </li>
        );
      })}
    </ul>
  );
}
