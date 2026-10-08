import { ButtonLink } from "@/components/ui/button";

const STEPS = [
  ["Загрузите логотип", "Сразу видно, как он смотрится на футболке, худи или кепке."],
  ["Получите КП", "Менеджер проверит макет и пришлёт предложение с ценой и сроком."],
  ["Следите за пошивом", "Раскрой, пошив, нанесение, ОТК, доставка — каждый этап онлайн."],
];

export default function Landing() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
      <header className="stitch flex items-center justify-between py-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold tracking-wide">JAMO</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted">Textile Produce</span>
        </div>
        <ButtonLink href="/login" size="sm">
          Войти
        </ButtonLink>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-10 py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Корпоративная одежда для вашей команды</h1>
          <p className="mt-4 text-base text-muted">
            Футболки, худи, кепки и спецодежда с логотипом компании. Макет, заказ, оплата и контроль производства — в одном кабинете.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/register" variant="primary">
              Зарегистрировать компанию
            </ButtonLink>
            <ButtonLink href="/login">У меня есть кабинет</ButtonLink>
          </div>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-xl border border-line bg-surface p-4">
              <span className="font-mono text-xs text-thread">0{i + 1}</span>
              <h2 className="mt-1 font-sans text-base font-semibold">{t}</h2>
              <p className="mt-1 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
