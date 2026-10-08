import Link from "next/link";
import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход для клиентов" };

export default async function CustomerLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthFrame
      variant="customer"
      title="Вход в кабинет компании"
      subtitle="Мы пришлём одноразовый код по SMS на номер, указанный при регистрации."
      footer={
        <>
          Компании ещё нет в JAMO?{" "}
          <Link href="/register" className="font-semibold text-accent hover:underline">
            Зарегистрируйтесь
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthFrame>
  );
}
