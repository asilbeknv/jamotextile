import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = { title: "Вход для сотрудников", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthFrame variant="admin" title="Панель управления" subtitle="Заказы, клиенты, каталог и аналитика JAMO Textile.">
      <AdminLoginForm next={next} />
    </AuthFrame>
  );
}
