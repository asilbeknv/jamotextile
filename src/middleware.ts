import { NextResponse, type NextRequest } from "next/server";
import { REALM, verifySession, type Realm } from "@/server/auth/realms";

/**
 * First line of access control, run before any page renders:
 *   /admin/**  → needs a valid admin token   (except /admin/login)
 *   /portal/** → needs a valid customer token
 * Signed-in users hitting their realm's login page are sent to its dashboard.
 * Pages re-check against the database via requireAdmin / requireCustomer.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const realm: Realm | null =
    pathname === "/admin" || pathname.startsWith("/admin/")
      ? "admin"
      : pathname === "/portal" || pathname.startsWith("/portal/") || pathname === "/login" || pathname === "/register"
        ? "customer"
        : null;
  if (!realm) return NextResponse.next();

  const cfg = REALM[realm];
  const isLoginPage = pathname === cfg.loginPath || (realm === "customer" && pathname === "/register");
  const session = await verifySession(realm, req.cookies.get(cfg.cookie)?.value);

  if (isLoginPage) {
    return session ? NextResponse.redirect(new URL(cfg.homePath, req.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL(cfg.loginPath, req.url);
    url.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(url);
    if (req.cookies.has(cfg.cookie)) res.cookies.delete(cfg.cookie); // drop expired/forged token
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/login", "/register"],
};
