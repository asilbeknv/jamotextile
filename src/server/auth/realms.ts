/**
 * Session tokens for the two login realms.
 *
 * Edge-safe (no Prisma, no Node APIs) so middleware can verify tokens.
 * Each realm has its own cookie name, signing secret and audience claim, so a
 * customer token can never be accepted as an admin token and vice versa.
 */
import { SignJWT, jwtVerify } from "jose";

export type Realm = "admin" | "customer";

export type AdminClaims = { realm: "admin"; sub: string; name: string; role: "OWNER" | "MANAGER" };
export type CustomerClaims = {
  realm: "customer";
  sub: string;
  name: string;
  companyId: string;
  role: "BUYER" | "ACCOUNTANT" | "HR" | "HEAD";
};
export type ClaimsFor<R extends Realm> = R extends "admin" ? AdminClaims : CustomerClaims;

const ISSUER = "jamotextile";

export const REALM = {
  admin: {
    cookie: "jamo_admin",
    audience: "jamo:admin",
    secretEnv: "AUTH_ADMIN_SECRET",
    ttlSeconds: 60 * 60 * 12, // 12 hours: staff sign in each working day
    loginPath: "/admin/login",
    homePath: "/admin",
  },
  customer: {
    cookie: "jamo_portal",
    audience: "jamo:portal",
    secretEnv: "AUTH_CUSTOMER_SECRET",
    ttlSeconds: 60 * 60 * 24 * 30, // 30 days: customers order occasionally
    loginPath: "/login",
    homePath: "/portal",
  },
} as const;

function secretFor(realm: Realm): Uint8Array {
  const value = process.env[REALM[realm].secretEnv];
  if (!value || value.length < 32) {
    throw new Error(`${REALM[realm].secretEnv} must be set to at least 32 characters`);
  }
  return new TextEncoder().encode(value);
}

export async function signSession<R extends Realm>(realm: R, claims: Omit<ClaimsFor<R>, "realm">): Promise<string> {
  const { sub, ...rest } = claims as { sub: string } & Record<string, unknown>;
  return new SignJWT({ ...rest, realm })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience(REALM[realm].audience)
    .setIssuedAt()
    .setExpirationTime(`${REALM[realm].ttlSeconds}s`)
    .sign(secretFor(realm));
}

export async function verifySession<R extends Realm>(realm: R, token: string | undefined): Promise<ClaimsFor<R> | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretFor(realm), {
      issuer: ISSUER,
      audience: REALM[realm].audience,
      algorithms: ["HS256"],
    });
    if (payload.realm !== realm || typeof payload.sub !== "string") return null;
    return payload as unknown as ClaimsFor<R>;
  } catch {
    return null;
  }
}
