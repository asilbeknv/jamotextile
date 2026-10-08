import { Progress } from "@/components/ui/progress";

export function WorkshopLoad({ items }: { items: { id: string; name: string; load: number; capacity: number }[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((w) => {
        const pct = w.capacity ? (w.load / w.capacity) * 100 : 0;
        return (
          <li key={w.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-2">
              <span className="font-semibold">{w.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted">
                {w.load} / {w.capacity} шт
              </span>
            </div>
            <Progress value={pct} tone={pct > 85 ? "bad" : pct > 60 ? "warn" : "accent"} label={w.name} />
          </li>
        );
      })}
    </ul>
  );
}
