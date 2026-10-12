"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createOrderAction, type NewOrderState } from "@/server/actions/customer-orders";
import { PLACEMENT_LABEL, SIZES } from "@/domain/catalog";
import { grossAmount, nextTier, priceOrder, vatAmount, type Tier } from "@/domain/pricing";
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
type Method = { slug: string; name: string; feePerUnit: number; setupFee: number };
type Catalog = {
  products: Product[];
  colors: { slug: string; name: string; hex: string }[];
  methods: Method[];
  tiers: Tier[];
};

type SizeRow = Record<string, number>;
type Item = {
  key: number;
  productSlug: string;
  colorSlug: string;
  placement: string;
  methodSlug: string;
  men: SizeRow;
  women: SizeRow;
  qty: number; // used for products without sizes
};

const MAX_ITEMS = 20;
const emptySizes = (): SizeRow => Object.fromEntries(SIZES.map((s) => [s, 0]));
const sum = (r: SizeRow) => Object.values(r).reduce((a, b) => a + b, 0);

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
  const nextKey = useRef(1);
  const productBy = useMemo(() => new Map(catalog.products.map((p) => [p.slug, p])), [catalog.products]);
  const methodBy = useMemo(() => new Map(catalog.methods.map((m) => [m.slug, m])), [catalog.methods]);

  const makeItem = (slug: string): Item => {
    const p = productBy.get(slug) ?? catalog.products[0];
    return {
      key: nextKey.current++,
      productSlug: p.slug,
      colorSlug: p.colors[0],
      placement: p.placements[0],
      methodSlug: catalog.methods[0]?.slug,
      men: emptySizes(),
      women: emptySizes(),
      qty: p.sized ? 0 : p.minQty,
    };
  };

  const [items, setItems] = useState<Item[]>(() => [makeItem(initialProduct ?? catalog.products[0]?.slug)]);
  const [sample, setSample] = useState(false);

  const update = (key: number, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const remove = (key: number) => setItems((list) => list.filter((it) => it.key !== key));
  const add = () => {
    // Suggest a product that isn't in the order yet.
    const used = new Set(items.map((i) => i.productSlug));
    const next = catalog.products.find((p) => !used.has(p.slug)) ?? catalog.products[0];
    setItems((list) => [...list, makeItem(next.slug)]);
  };

  const qtyOf = (it: Item) => (sample ? 1 : productBy.get(it.productSlug)!.sized ? sum(it.men) + sum(it.women) : it.qty);
  const priced = priceOrder(
    items.map((it) => {
      const p = productBy.get(it.productSlug)!;
      const m = methodBy.get(it.methodSlug)!;
      return { basePrice: p.basePrice, qty: qtyOf(it), feePerUnit: m.feePerUnit, setupFee: m.setupFee };
    }),
    catalog.tiers,
    companyDiscountPct,
  );
  const problems = items
    .map((it, i) => {
      const p = productBy.get(it.productSlug)!;
      const q = qtyOf(it);
      if (q < 1) return `Позиция ${i + 1} (${p.name}): укажите количество`;
      if (!sample && q < p.minQty) return `Позиция ${i + 1} (${p.name}): минимум ${p.minQty} шт`;
      return null;
    })
    .filter(Boolean) as string[];
  const upcoming = sample ? null : nextTier(priced.totalQty, catalog.tiers);
  const setupTotal = priced.lines.reduce((a, l) => a + l.setupFee, 0);
  const discountPct = priced.lines[0]?.discountPct ?? 0;

  const payload = JSON.stringify(
    items.map((it) => {
      const p = productBy.get(it.productSlug)!;
      const sized = p.sized && !sample;
      return {
        productSlug: it.productSlug,
        colorSlug: it.colorSlug,
        placement: it.placement,
        methodSlug: it.methodSlug,
        qty: qtyOf(it),
        sizes: sized ? { men: it.men, women: it.women } : null,
      };
    }),
  );

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <input type="hidden" name="items" value={payload} />

      <div className="flex flex-col gap-6">
        {items.map((it, i) => (
          <ItemEditor
            key={it.key}
            index={i}
            item={it}
            catalog={catalog}
            product={productBy.get(it.productSlug)!}
            qty={qtyOf(it)}
            sample={sample}
            removable={items.length > 1}
            onChange={(patch) => update(it.key, patch)}
            onRemove={() => remove(it.key)}
            onPickProduct={(slug) => {
              const fresh = makeItem(slug);
              update(it.key, { ...fresh, key: it.key });
            }}
          />
        ))}

        <button
          type="button"
          onClick={add}
          disabled={items.length >= MAX_ITEMS}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface/60 p-4 font-semibold text-accent hover:border-accent disabled:opacity-50"
        >
          <span aria-hidden className="text-lg leading-none">+</span> Добавить изделие в заказ
        </button>

        <Card>
          <CardHeader title="Доставка и комментарий" />
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
          <label className="mt-4 flex cursor-pointer items-start gap-2">
            <input type="checkbox" name="isSample" checked={sample} onChange={(e) => setSample(e.target.checked)} className="mt-1" />
            <span>
              Сначала пробные образцы (по 1 шт каждой позиции)
              <span className="block text-xs text-muted">Изготовим за 3–5 дней, тираж запустим после одобрения.</span>
            </span>
          </label>
        </Card>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <Card>
          <CardHeader title="Расчёт заказа" />
          <ul className="mb-3 flex flex-col gap-1.5 border-b border-dashed border-line pb-3">
            {items.map((it, i) => (
              <li key={it.key} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {productBy.get(it.productSlug)!.name} <span className="text-muted">×{qtyOf(it)}</span>
                </span>
                <span className="whitespace-nowrap font-mono text-xs">{formatSum(priced.lines[i].lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
            <dt className="text-muted">Всего изделий</dt>
            <dd className="text-right font-mono">{priced.totalQty} шт</dd>
            {discountPct > 0 && (
              <>
                <dt className="text-muted">Скидка за тираж</dt>
                <dd className="text-right font-mono">−{discountPct}%</dd>
              </>
            )}
            <dt className="text-muted">Подготовка к нанесению</dt>
            <dd className="text-right font-mono">{formatSum(setupTotal)}</dd>
            <dt className="text-muted">НДС 12%</dt>
            <dd className="text-right font-mono">{formatSum(vatAmount(priced.net))}</dd>
            <dt className="font-bold">Итого</dt>
            <dd className="text-right font-mono text-base font-bold">{formatSum(grossAmount(priced.net))}</dd>
          </dl>
          {upcoming && (
            <p className="mt-3 text-xs text-muted">
              Ещё {upcoming.minQty - priced.totalQty} шт в заказе до скидки {upcoming.pct}%. Скидка считается по всем изделиям вместе.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Предварительный расчёт. Точную цену менеджер подтвердит в КП.</p>
        </Card>
        {problems.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs font-medium text-bad">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <FormMessage error={state.error} />
        <SubmitButton variant="primary" disabled={problems.length > 0} pendingLabel="Отправляем…">
          Отправить заявку
        </SubmitButton>
      </aside>
    </form>
  );
}

function ItemEditor({
  index,
  item,
  catalog,
  product,
  qty,
  sample,
  removable,
  onChange,
  onRemove,
  onPickProduct,
}: {
  index: number;
  item: Item;
  catalog: Catalog;
  product: Product;
  qty: number;
  sample: boolean;
  removable: boolean;
  onChange: (patch: Partial<Item>) => void;
  onRemove: () => void;
  onPickProduct: (slug: string) => void;
}) {
  const tooFew = !sample && qty > 0 && qty < product.minQty;
  const colorName = catalog.colors.find((c) => c.slug === item.colorSlug)?.name;

  return (
    <Card aria-label={`Позиция ${index + 1}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium">
          <span className="font-mono text-thread">{String(index + 1).padStart(2, "0")}</span> {product.name}
        </h2>
        {removable && (
          <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs font-semibold text-bad hover:bg-bad-soft">
            Удалить
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted">Изделие</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {catalog.products.map((p) => (
              <button
                type="button"
                key={p.slug}
                onClick={() => p.slug !== item.productSlug && onPickProduct(p.slug)}
                aria-pressed={p.slug === item.productSlug}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg border-2 px-3 py-2 text-left",
                  p.slug === item.productSlug ? "border-accent bg-accent-soft/40" : "border-line hover:border-accent/50",
                )}
              >
                <b className="text-sm">{p.name}</b>
                <span className="text-[11px] text-muted">
                  от {formatSum(p.basePrice)} · от {p.minQty} шт
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {product.fabric} · производство около {product.leadDays} дн.
          </p>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted">
            Цвет: <span className="text-ink">{colorName}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((slug) => {
              const c = catalog.colors.find((x) => x.slug === slug);
              return (
                <button
                  type="button"
                  key={slug}
                  onClick={() => onChange({ colorSlug: slug })}
                  title={c?.name}
                  aria-label={c?.name}
                  aria-pressed={slug === item.colorSlug}
                  className={cn("h-9 w-9 rounded-full border-2 border-line", slug === item.colorSlug && "outline outline-[3px] outline-offset-2 outline-accent")}
                  style={{ background: c?.hex }}
                />
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-muted">Место нанесения</legend>
            <div className="flex flex-wrap gap-2">
              {product.placements.map((pl) => (
                <button
                  type="button"
                  key={pl}
                  onClick={() => onChange({ placement: pl })}
                  aria-pressed={pl === item.placement}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    pl === item.placement ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface",
                  )}
                >
                  {PLACEMENT_LABEL[pl] ?? pl}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="label">
            Способ нанесения
            <select value={item.methodSlug} onChange={(e) => onChange({ methodSlug: e.target.value })} className="field">
              {catalog.methods.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name} (+{formatSum(m.feePerUnit)}/шт)
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-muted">Количество · минимум {product.minQty} шт</span>
            <span className={cn("font-mono text-sm font-semibold", tooFew && "text-bad")}>{qty} шт</span>
          </div>
          {sample ? (
            <p className="text-sm text-muted">Пробный образец: 1 шт.</p>
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
                      ["Муж.", "men"],
                      ["Жен.", "women"],
                    ] as const
                  ).map(([label, key]) => (
                    <tr key={key}>
                      <td className="pr-2 text-left text-xs text-muted">{label}</td>
                      {SIZES.map((s) => (
                        <td key={s} className="p-1">
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            aria-label={`Позиция ${index + 1}, ${label} ${s}`}
                            value={item[key][s] || ""}
                            placeholder="0"
                            onChange={(e) => onChange({ [key]: { ...item[key], [s]: Math.max(0, Number(e.target.value) || 0) } })}
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
            <input
              type="number"
              min={0}
              aria-label={`Позиция ${index + 1}, количество`}
              value={item.qty || ""}
              onChange={(e) => onChange({ qty: Math.max(0, Number(e.target.value) || 0) })}
              className="field max-w-[160px]"
            />
          )}
          {tooFew && <p className="mt-1.5 text-xs font-medium text-bad">Минимальный тираж для этой позиции: {product.minQty} шт.</p>}
        </div>
      </div>
    </Card>
  );
}
