import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatUzPhone } from "@/domain/phone";

/** Second step shared by login and registration: enter the 6-digit SMS code. */
export function OtpStep({
  action,
  phone,
  next,
  error,
  info,
  devCode,
  onBack,
}: {
  action: (form: FormData) => void;
  phone: string;
  next?: string;
  error?: string;
  info?: string;
  devCode?: string;
  onBack: () => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="intent" value="verify" />
      <input type="hidden" name="phone" value={phone} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage error={error} info={!error ? info : undefined} />
      <p className="text-muted">
        Номер: <span className="font-mono text-ink">{formatUzPhone(phone)}</span>{" "}
        <button type="button" onClick={onBack} className="font-semibold text-accent hover:underline">
          изменить
        </button>
      </p>
      <label className="label">
        Код из SMS
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          defaultValue={devCode}
          className="field font-mono text-lg tracking-[0.4em]"
        />
      </label>
      {devCode && (
        <p className="rounded-lg border border-dashed border-thread px-3 py-2 text-xs text-muted">
          Режим разработки: SMS не отправляются, код <b className="font-mono text-ink">{devCode}</b> подставлен автоматически.
        </p>
      )}
      <SubmitButton variant="primary" pendingLabel="Проверяем…">
        Войти
      </SubmitButton>
    </form>
  );
}
