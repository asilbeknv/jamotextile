"use client";

import { useActionState, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type Result = { ok: boolean; message?: string } | null;

/**
 * Small form wrapper for a server action returning { ok, message }.
 * Hidden fields carry ids; the action re-checks the session and permissions.
 */
export function ActionForm({
  action,
  hidden,
  children,
  className,
  resetOnSuccess,
}: {
  action: (state: Result, form: FormData) => Promise<Result>;
  hidden: Record<string, string>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={cn("flex flex-col gap-2", className)}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      {state?.message && (
        <p role="status" className={cn("text-xs font-medium", state.ok ? "text-ok" : "text-bad")}>
          {state.message}
        </p>
      )}
    </form>
  );
}
