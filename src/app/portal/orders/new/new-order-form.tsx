"use client";

import { useActionState, useMemo, useState } from "react";
import { createOrderAction, type NewOrderState } from "@/server/actions/customer-orders";
import { PLACEMENT_LABEL, SIZES } from "@/domain/catalog";
import { grossAmount, nextTier, priceLine, vatAmount, type Tier } from "@/domain/pricing";
import { formatSum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

type Product = {
  slug: string;
  name: string;
  basePrice: number;
  minQty: number;
  leadDays: number;
  fabric: string;
  sized: boolean;
  placements: string[];
  colors: string[];
};
type Catalog = {
  products: Product[];
  colors: { slug: string; name: string; hex: string }[];
  methods: { slug: string; name: string; feePerUnit: number; setupFee: number }[];
  tiers: Tier[];
};

const emptySizes = () => Object.fromEntries(SIZES.map((s) => [s, 0])) as Record<string, number>;

export function NewOrderForm({
  catalog,
  companyDiscountPct,
  addresses,
  initialProduct,
}: {
  catalog: Catalog;
  companyDiscountPct: number;
  addresses: string[];
  initialProduct?: string;
}) {
  const [state, action] = useActionState(createOrderAction, {} as NewOrderState);
  const [productSlug, setProductSlug] = useState(
    catalog.products.find((p) => p.slug === initialProduct)?.slug ?? catalog.products[0]?.slug,
  );
  const product = catalog.products.find((p) => p.slug === productSlug)!;
  const [color, setColor] = useState(product.colors[0]);
  const [placement, setPlacement] = useState(product.placements[0]);
  const [methodSlug, setMethodSlug] = useState(catalog.methods[0]?.slug);
  const [men, setMen] = useState(emptySizes);
  const [women, setWomen] = useState(emptySizes);
  const [plainQty, setPlainQty] = useState(product.minQty);
  const [sample, setSample] = useState(false);

  const pickProduct = (p: Product) => {
    setProductSlug(p.slug);
    setColor(p.colors[0]);
    setPlacement(p.placements[0]);
    setPlainQty(p.minQty);
  };

  const sizedQty = Object.values(men).reduce((a, b) => a + b, 0) + Object.values(women).reduce((a, b) => a + b, 0);
  const qty = sample ? 1 : product.sized ? sizedQty : plainQty;
  const method = catalog.methods.find((m) => m.slug === methodSlug)!;
  const price = useMemo(
    () =>
      priceLine({
        basePrice: product.basePrice,
        qty,
        feePerUnit: method.feePerUnit,
        setupFee: method.setupFee,
        tiers: catalog.tiers,
        companyDiscountPct,
      }),
    [product, qty, method, catalog.tiers, companyDiscountPct],
  );
  const upcoming = nextTier(qty, catalog.tiers);
  const tooFew = !sample && qty > 0 && qty < product.minQty;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <input type="hidden" name="productSlug" value={product.slug} />
      <input type="hidden" name="colorSlug" value={color} />
      <input type="hidden" name="placement" value={placement} />
      <input type="hidden" name="qty" value={qty} />
      {product.sized && !sample && (
        <input type="hidden" name="sizes" value={JSON.stringify({ men, women })} />
      )}

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="1. Изделие" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {catalog.products.map((p) => (
              <button
                type="button"
                key={p.slug}
                onClick={() => pickProduct(p)}
                aria-pressed={p.slug === product.slug}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border-2 p-3 text-left",
                  p.slug === product.slug ? "border-accent bg-accent-soft/40" : "border-line hover:border-accent/50",
                )}
              >
                <b>{p.name}</b>
                <span className="text-xs text-muted">
                  от {formatSum(p.basePrice)} · от {p.minQty} шт · {p.leadDays} дн.
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Материал: {product.fabric}</p>
        </Card>

        <Card>
          <CardHeader title="2. Цвет и нанесение" />
          <div className="flex flex-col gap-4">
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-muted">
                Цвет: <span className="text-ink">{catalog.colors.find((c) => c.slug === color)?.name}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((slug) => {
                  const c = catalog.colors.find((x) => x.slug === slug);
                  return (
                    <button
                      type="button"
                      key={slug}
                      onClick={() => setColor(slug)}
                      title={c?.name}
                      aria-label={c?.name}
                      aria-pressed={slug === color}
                      className={cn("h-9 w-9 rounded-full border-2 border-line", slug === color && "outline outline-[3px] outline-offset-2 outline-accent")}
                      style={{ background: c?.hex }}
                    />
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-muted">Место нанесения</legend>
              <div className="flex flex-wrap gap-2">
                {product.placements.map((pl) => (
                  <button
                    type="button"
                    key={pl}
                    onClick={() => setPlacement(pl)}
                    aria-pressed={pl === placement}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 font-medium",
                      pl === placement ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface",
                    )}
                  >
                    {PLACEMENT_LABEL[pl] ?? pl}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="label">
              Способ нанесения
              <select name="methodSlug" value={methodSlug} onChange={(e) => setMethodSlug(e.target.value)} className="field">
                {catalog.methods.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name} (+{formatSum(m.feePerUnit)}/шт, подготовка {formatSum(m.setupFee)})
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-muted">
              Логотип берём из профиля компании. Для вышивки и шелкографии менеджер запросит векторный файл (SVG, AI, PDF).
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="3. Количество" hint={`Минимальный тираж: ${product.minQty} шт.`} />
          {sample ? (
            <p className="text-muted">Пробный образец: 1 шт. Основной тираж оформим после вашего одобрения.</p>
          ) : product.sized ? (
            <div className="overflow-x-auto">
              <table className="text-center">
                <thead>
                  <tr className="text-xs text-muted">
                    <th />
                    {SIZES.map((s) => (
                      <th key={s} className="px-1 pb-1 font-semibold">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["Муж.", men, setMen],
                      ["Жен.", women, setWomen],
                    ] as const
                  ).map(([label, row, set]) => (
                    <tr key={label}>
                      <td className="pr-2 text-left text-xs text-muted">{label}</td>
                      {SIZES.map((s) => (
                        <td key={s} className="p-1">
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            aria-label={`${label} ${s}`}
                            value={row[s] || ""}
                            placeholder="0"
                            onChange={(e) => set({ ...row, [s]: Math.max(0, Number(e.target.value) || 0) })}
                            className="field w-16 px-1 text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <label className="label max-w-[200px]">
              Количество, шт
              <input
                type="number"
                min={0}
                value={plainQty || ""}
                onChange={(e) => setPlainQty(Math.max(0, Number(e.target.value) || 0))}
                className="field"
              />
            </label>
          )}
          <div className="mt-3 flex justify-between font-semibold">
            <span>Всего</span>
            <span className="font-mono">{qty} шт</span>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-2">
            <input type="checkbox" name="isSample" checked={sample} onChange={(e) => setSample(e.target.checked)} className="mt-1" />
            <span>
              Сначала пробный образец (1 шт)
              <span className="block text-xs text-muted">Изготовим за 3–5 дней, тираж запустим после одобрения.</span>
            </span>
          </label>
        </Card>

        <Card>
          <CardHeader title="4. Доставка и комментарий" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Адрес доставки
              {addresses.length ? (
                <select name="deliveryAddress" className="field">
                  {addresses.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              ) : (
                <input name="deliveryAddress" placeholder="Город, улица, дом" className="field" />
              )}
            </label>
            <label className="label">
              Желаемая дата получения
              <input type="date" name="dueDate" className="field" />
            </label>
          </div>
          <label className="label mt-4">
            Комментарий для менеджера
            <textarea name="comment" rows={3} maxLength={2000} placeholder="Например: нужны светоотражающие полосы" className="field" />
          </label>
        </Card>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <Card>
          <CardHeader title="Расчёт" />
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
            <dt className="text-muted">Количество</dt>
            <dd className="text-right font-mono">{qty} шт</dd>
            <dt className="text-muted">Цена за шт</dt>
            <dd className="text-right font-mono">{formatSum(price.unitPrice)}</dd>
            {price.discountPct > 0 && (
              <>
                <dt className="text-muted">Скидка</dt>
                <dd className="text-right font-mono">−{price.discountPct}%</dd>
              </>
            )}
            <dt className="text-muted">Подготовка</dt>
            <dd className="text-right font-mono">{formatSum(price.setupFee)}</dd>
            <dt className="text-muted">НДС 12%</dt>
            <dd className="text-right font-mono">{formatSum(vatAmount(price.lineTotal))}</dd>
            <dt className="font-bold">Итого</dt>
            <dd className="text-right font-mono text-base font-bold">{formatSum(grossAmount(price.lineTotal))}</dd>
          </dl>
          {tooFew ? (
            <p className="mt-3 text-xs font-medium text-bad">Минимальный тираж: {product.minQty} шт.</p>
          ) : (
            upcoming &&
            !sample && (
              <p className="mt-3 text-xs text-muted">
                Ещё {upcoming.minQty - qty} шт до скидки {upcoming.pct}%.
              </p>
            )
          )}
          <p className="mt-2 text-xs text-muted">Предварительный расчёт. Точную цену менеджер подтвердит в КП.</p>
        </Card>
        <FormMessage error={state.error} />
        <SubmitButton variant="primary" disabled={qty < 1 || tooFew} pendingLabel="Отправляем…">
          Отправить заявку
        </SubmitButton>
      </aside>
    </form>
  );
}
