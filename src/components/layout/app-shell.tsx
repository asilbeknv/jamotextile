"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/config/navigation";
import { Icon } from "./icons";

/**
 * Dashboard frame shared by both realms: sidebar (drawer on mobile), top bar
 * with the signed-in identity and a sign-out form, and the page content.
 * Each realm passes its own nav, label and sign-out server action.
 */
export function AppShell({
  realmLabel,
  nav,
  user,
  signOut,
  banner,
  children,
}: {
  realmLabel: string;
  nav: NavItem[];
  user: { name: string; detail: string };
  signOut: () => Promise<void>;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  // Longest matching prefix wins, so /portal/orders/new doesn't also light up /portal/orders.
  const activeHref = nav
    .filter((n) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const sidebar = (
    <nav className="flex flex-col gap-1" aria-label="Разделы">
      {nav.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={n.href === activeHref ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium",
            n.href === activeHref ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface2 hover:text-ink",
          )}
        >
          <Icon name={n.icon} />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface lg:flex lg:flex-col lg:gap-6 lg:p-4">
        <Brand realmLabel={realmLabel} />
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/50" aria-label="Закрыть меню" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 bg-surface p-4 shadow-card">
            <Brand realmLabel={realmLabel} />
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="stitch sticky top-0 z-30 flex items-center justify-between gap-3 bg-bg/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-line bg-surface p-2 lg:hidden"
              aria-label="Открыть меню"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="lg:hidden">
              <Brand realmLabel={realmLabel} compact />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="font-semibold leading-tight">{user.name}</div>
              <div className="text-xs text-muted">{user.detail}</div>
            </div>
            <form action={signOut}>
              <button className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:border-accent">Выйти</button>
            </form>
          </div>
        </header>
        {banner}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function Brand({ realmLabel, compact }: { realmLabel: string; compact?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn("font-display font-bold tracking-wide", compact ? "text-lg" : "text-xl")}>JAMO</span>
      <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.1em] text-muted">{realmLabel}</span>
    </div>
  );
}
