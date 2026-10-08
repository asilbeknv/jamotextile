import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-sm text-thread">404</p>
      <h1 className="text-2xl font-bold">Страница не найдена</h1>
      <ButtonLink href="/">На главную</ButtonLink>
    </div>
  );
}
