"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimit } from "@/server/auth/rate-limit";
import { endSession, startSession } from "@/server/auth/session";

export type AdminLoginState = { error?: string; email?: string };

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = "$2b$12$BcvXSf7XxfpM8AVPcmNAseKetciLalB5WQ2/30GEC7sLv.TQKZAJS";

export async function adminLogin(_: AdminLoginState, form: FormData): Promise<AdminLoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { email, error: "Введите email и пароль" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`admin-login:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!rl.ok) return { email, error: `Слишком много попыток. Повторите через ${Math.ceil(rl.retryAfterSec / 60)} мин.` };

  const admin = await db.adminUser.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !valid || !admin.isActive) return { email, error: "Неверный email или пароль" };

  await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await startSession("admin", { sub: admin.id, name: admin.name, role: admin.role });

  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin");
}

export async function adminLogout() {
  await endSession("admin");
  redirect("/admin/login");
}
