import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string): string {
  return createHmac("sha256", process.env.AUTH_CUSTOMER_SECRET ?? "").update(`${phone}:${code}`).digest("hex");
}

/** Creates a fresh 6-digit code for `phone`, invalidating earlier ones. */
export async function issueOtp(phone: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction([
    db.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } }),
    db.otpCode.create({ data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) } }),
  ]);
  return code;
}

export type OtpResult = "ok" | "invalid" | "expired" | "too_many_attempts";

export async function verifyOtp(phone: string, code: string): Promise<OtpResult> {
  const otp = await db.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt < new Date()) return "expired";
  if (otp.attempts >= MAX_ATTEMPTS) return "too_many_attempts";

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, code.trim()), "hex");
  if (!timingSafeEqual(expected, actual)) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return "invalid";
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return "ok";
}
