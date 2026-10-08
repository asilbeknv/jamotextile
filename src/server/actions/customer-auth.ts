"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Industry } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeUzPhone } from "@/domain/phone";
import { issueOtp, verifyOtp } from "@/server/auth/otp";
import { rateLimit } from "@/server/auth/rate-limit";
import { endSession, startSession } from "@/server/auth/session";
import { isDevSms, smsProvider } from "@/server/sms";

export type LoginState = {
  step: "phone" | "code";
  phone?: string;
  error?: string;
  info?: string;
  devCode?: string; // shown only when SMS is printed to the console (local development)
};

async function sendCode(phone: string): Promise<Pick<LoginState, "error" | "devCode">> {
  const rl = rateLimit(`otp:${phone}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return { error: `Слишком много запросов. Повторите через ${Math.ceil(rl.retryAfterSec / 60)} мин.` };
  const code = await issueOtp(phone);
  await smsProvider().send(phone, `JAMO: код для входа ${code}. Никому его не сообщайте.`);
  return isDevSms() ? { devCode: code } : {};
}

async function requestLoginCode(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = normalizeUzPhone(String(form.get("phone") ?? ""));
  if (!phone) return { step: "phone", error: "Введите номер в формате +998 90 123-45-67" };

  const user = await db.customerUser.findUnique({ where: { phone }, select: { isActive: true } });
  // Same answer whether or not the number exists, so the form can't be used to probe customers.
  const sent = user?.isActive ? await sendCode(phone) : {};
  if (sent.error) return { step: "phone", error: sent.error };
  return {
    step: "code",
    phone,
    devCode: sent.devCode,
    info: "Если номер зарегистрирован, мы отправили код по SMS.",
  };
}

export async function verifyLoginCode(state: LoginState, form: FormData): Promise<LoginState> {
  const phone = normalizeUzPhone(String(form.get("phone") ?? ""));
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!phone) return { step: "phone", error: "Введите номер телефона" };
  if (code.length !== 6) return { ...state, step: "code", phone, error: "Код состоит из 6 цифр" };

  const rl = rateLimit(`otp-verify:${phone}`, 10, 15 * 60 * 1000);
  if (!rl.ok) return { ...state, step: "code", phone, error: "Слишком много попыток. Запросите новый код позже." };

  const result = await verifyOtp(phone, code);
  if (result !== "ok") {
    const error = {
      invalid: "Неверный код",
      expired: "Код истёк. Запросите новый.",
      too_many_attempts: "Слишком много попыток. Запросите новый код.",
    }[result];
    return { ...state, step: "code", phone, error };
  }

  const user = await db.customerUser.findUnique({ where: { phone }, include: { company: true } });
  if (!user?.isActive || user.company.status === "BLOCKED") {
    return { step: "phone", error: "Доступ закрыт. Свяжитесь с менеджером JAMO." };
  }
  await db.customerUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession("customer", { sub: user.id, name: user.name, companyId: user.companyId, role: user.role });

  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/portal") ? next : "/portal");
}

/** Single entry point for the two-step login form: `intent` picks the step. */
export async function customerLogin(state: LoginState, form: FormData): Promise<LoginState> {
  return form.get("intent") === "verify" ? verifyLoginCode(state, form) : requestLoginCode(state, form);
}

// ───────────── Registration ─────────────

const RegisterSchema = z.object({
  company: z.string().trim().min(2, "Введите название компании").max(120),
  inn: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => v === "" || /^\d{9}$/.test(v), "ИНН — 9 цифр")
    .transform((v) => v || null),
  name: z.string().trim().min(2, "Введите имя контактного лица").max(80),
  phone: z.string().transform((v, ctx) => {
    const p = normalizeUzPhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "Введите номер в формате +998 90 123-45-67" });
    return p ?? "";
  }),
  industry: z.enum(["HOSPITALITY", "RETAIL", "INDUSTRY", "SERVICE", "OTHER"]),
});

export type RegisterState = LoginState & { fields?: Record<string, string> };

export async function registerCompany(_: RegisterState, form: FormData): Promise<RegisterState> {
  const raw = Object.fromEntries(["company", "inn", "name", "phone", "industry"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return { step: "phone", fields: raw, error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const [phoneTaken, innTaken] = await Promise.all([
    db.customerUser.findUnique({ where: { phone: d.phone }, select: { id: true } }),
    d.inn ? db.company.findUnique({ where: { inn: d.inn }, select: { id: true } }) : null,
  ]);
  if (phoneTaken) return { step: "phone", fields: raw, error: "Номер уже зарегистрирован. Войдите по SMS-коду." };
  if (innTaken) return { step: "phone", fields: raw, error: "Компания с таким ИНН уже есть. Попросите коллегу пригласить вас." };

  await db.company.create({
    data: {
      name: d.company,
      inn: d.inn,
      industry: d.industry as Industry,
      users: { create: { name: d.name, phone: d.phone, role: "HEAD" } },
    },
  });

  // Registration is confirmed with the same SMS code as login.
  const sent = await sendCode(d.phone);
  if (sent.error) return { step: "phone", fields: raw, error: sent.error };
  return { step: "code", phone: d.phone, devCode: sent.devCode, info: "Компания создана. Подтвердите номер кодом из SMS." };
}

export async function customerLogout() {
  await endSession("customer");
  redirect("/login");
}
