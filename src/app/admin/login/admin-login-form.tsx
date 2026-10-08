"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginState } from "@/server/actions/admin-auth";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function AdminLoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(adminLogin, {} as AdminLoginState);
  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage error={state.error} />
      <label className="label">
        Рабочий email
        <input name="email" type="email" autoComplete="username" required defaultValue={state.email} className="field" />
      </label>
      <label className="label">
        Пароль
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </label>
      <SubmitButton variant="primary" pendingLabel="Входим…">
        Войти в панель
      </SubmitButton>
    </form>
  );
}
