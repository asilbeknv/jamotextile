import Link from "next/link";
import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Регистрация компании" };

export default function RegisterPage() {
  return (
    <AuthFrame
      variant="customer"
      title="Новая компания"
      subtitle="Заполните реквизиты — вы станете администратором кабинета компании."
      footer={
        <>
          Уже есть кабинет?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Войти
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthFrame>
  );
}
