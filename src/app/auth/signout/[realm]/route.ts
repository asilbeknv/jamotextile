import { NextResponse, type NextRequest } from "next/server";
import { REALM, type Realm } from "@/server/auth/realms";

/** Clears the realm's session cookie and returns to that realm's login page. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ realm: string }> }) {
  const { realm } = await params;
  if (realm !== "admin" && realm !== "customer") return new NextResponse(null, { status: 404 });
  const cfg = REALM[realm as Realm];
  const res = NextResponse.redirect(new URL(cfg.loginPath, req.url));
  res.cookies.delete(cfg.cookie);
  return res;
}
