import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession } from "./session";

/**
 * Page/action guards. Middleware already rejects requests without a valid
 * token; these re-check against the database so a deactivated user or a
 * blocked company loses access immediately, not when the token expires.
 * Wrapped in React `cache` so a layout and page share one lookup per request.
 */

/** Clears a stale cookie (valid token, but user no longer allowed) and returns to login. */
const signOutPath = (realm: "admin" | "customer") => `/auth/signout/${realm}`;

export const getAdmin = cache(async () => {
  const s = await readSession("admin");
  if (!s) return null;
  const admin = await db.adminUser.findUnique({
    where: { id: s.sub },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  return admin?.isActive ? admin : null;
});

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect(signOutPath("admin"));
  return admin;
}

export async function requireOwner() {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") redirect("/admin");
  return admin;
}

export const getCustomer = cache(async () => {
  const s = await readSession("customer");
  if (!s) return null;
  const user = await db.customerUser.findUnique({
    where: { id: s.sub },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      company: { select: { id: true, name: true, status: true, logoUrl: true } },
    },
  });
  if (!user?.isActive || user.company.status === "BLOCKED") return null;
  return user;
});

export async function requireCustomer() {
  const user = await getCustomer();
  if (!user) redirect(signOutPath("customer"));
  return user;
}
