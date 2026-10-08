"use client";

import { useActionState, useState } from "react";
import { customerLogin, registerCompany, type LoginState, type RegisterState } from "@/server/actions/customer-auth";
import { INDUSTRY_LABEL } from "@/domain/catalog";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { OtpStep } from "@/components/auth/otp-step";

export function RegisterForm() {
  const [reg, register] = useActionState(registerCompany, { step: "phone" } as RegisterState);
  const [verified, verify] = useActionState(customerLogin, { step: "code" } as LoginState);
  const [back, setBack] = useState(false);

  if (reg.step === "code" && !back) {
    return (
      <OtpStep
        action={verify}
        phone={reg.phone!}
        devCode={reg.devCode}
        info={reg.info}
        error={verified.error}
        onBack={() => setBack(true)}
      />
    );
  }

  const f = reg.fields ?? {};
  return (
    <form action={register} className="flex flex-col gap-4">
      <FormMessage error={reg.error} info={back ? "Компания уже создана. Войдите по номеру телефона на странице входа." : undefined} />
      <label className="label">
        Название компании
        <input name="company" required placeholder="ООО «Название»" defaultValue={f.company} className="field" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          ИНН
          <input name="inn" inputMode="numeric" placeholder="9 цифр" defaultValue={f.inn} className="field" />
        </label>
        <label className="label">
          Отрасль
          <select name="industry" defaultValue={f.industry ?? "HOSPITALITY"} className="field">
            {Object.entries(INDUSTRY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="label">
        Ваше имя
        <input name="name" required autoComplete="name" defaultValue={f.name} className="field" />
      </label>
      <label className="label">
        Телефон
        <input name="phone" type="tel" required autoComplete="tel" defaultValue={f.phone ?? "+998 "} className="field" />
      </label>
      <SubmitButton variant="primary" pendingLabel="Создаём…">
        Зарегистрировать компанию
      </SubmitButton>
      <p className="text-xs text-muted">Менеджер JAMO подтвердит компанию. До этого можно готовить макеты, заказы уйдут в работу после подтверждения.</p>
    </form>
  );
}
