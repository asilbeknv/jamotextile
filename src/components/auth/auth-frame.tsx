import Link from "next/link";
import { cn } from "@/lib/cn";

/** Centered card used by every sign-in screen. `variant` keeps the two realms visually distinct. */
export function AuthFrame({
  variant,
  title,
  subtitle,
  children,
  footer,
}: {
  variant: "customer" | "admin";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-wide">JAMO</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
            {variant === "admin" ? "Back office" : "Textile Produce"}
          </span>
        </Link>
        <div className={cn("rounded-2xl border bg-surface p-6 shadow-card", variant === "admin" ? "border-accent/40" : "border-line")}>
          {variant === "admin" && (
            <p className="mb-3 inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">Только для сотрудников JAMO</p>
          )}
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mb-5 mt-1 text-muted">{subtitle}</p>
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}
