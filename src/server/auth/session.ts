import "server-only";
import { cookies } from "next/headers";
import { REALM, signSession, verifySession, type ClaimsFor, type Realm } from "./realms";

export async function startSession<R extends Realm>(realm: R, claims: Omit<ClaimsFor<R>, "realm">) {
  const token = await signSession(realm, claims);
  (await cookies()).set(REALM[realm].cookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REALM[realm].ttlSeconds,
  });
}

export async function readSession<R extends Realm>(realm: R): Promise<ClaimsFor<R> | null> {
  return verifySession(realm, (await cookies()).get(REALM[realm].cookie)?.value);
}

export async function endSession(realm: Realm) {
  (await cookies()).delete(REALM[realm].cookie);
}
