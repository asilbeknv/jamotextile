import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";

const KIND = {
  company: { label: "Клиент", tone: "accent" },
  handoff: { label: "В цех", tone: "ok" },
  overdue: { label: "Просрочен", tone: "bad" },
} as const;

export function AttentionList({ items }: { items: { kind: keyof typeof KIND; href: string; title: string; detail: string }[] }) {
  if (!items.length) return <EmptyState>Всё под контролем — срочных задач нет.</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {items.map((i, k) => (
        <li key={k}>
          <Link href={i.href} className="flex items-center justify-between gap-3 py-2.5 hover:text-accent">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{i.title}</span>
              <span className="text-xs text-muted">{i.detail}</span>
            </span>
            <Badge tone={KIND[i.kind].tone}>{KIND[i.kind].label}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
