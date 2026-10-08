import { Progress } from "@/components/ui/progress";

/** Ranked horizontal bars: label · bar · value. */
export function BarList({ items, format = String }: { items: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3">
          <span className="truncate">{i.label}</span>
          <Progress value={(i.value / max) * 100} label={i.label} />
          <span className="font-mono text-xs tabular-nums">{format(i.value)}</span>
        </li>
      ))}
    </ul>
  );
}
