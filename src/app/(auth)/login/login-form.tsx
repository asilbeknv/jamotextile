"use client";

import { useActionState, useState } from "react";
import { customerLogin, type LoginState } from "@/server/actions/customer-auth";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { OtpStep } from "@/components/auth/otp-step";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(customerLogin, { step: "phone" } as LoginState);
  const [editingPhone, setEditingPhone] = useState(false);

  if (state.step === "code" && !editingPhone) {
    return (
      <OtpStep
        action={action}
        phone={state.phone!}
        next={next}
        devCode={state.devCode}
        info={state.info}
        error={state.error}
        onBack={() => setEditingPhone(true)}
      />
    );
  }

  return (
    <form
      action={(f) => {
        setEditingPhone(false);
        action(f);
      }}
      className="flex flex-col gap-4"
    >
      <FormMessage error={state.step === "phone" ? state.error : undefined} />
      <label className="label">
        Телефон
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123-45-67"
          defaultValue={state.phone ?? "+998 "}
          required
          className="field"
        />
      </label>
      <SubmitButton variant="primary" pendingLabel="Отправляем…">
        Получить код
      </SubmitButton>
    </form>
  );
}
