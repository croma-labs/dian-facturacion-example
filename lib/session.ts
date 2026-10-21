import "server-only";

import { cookies } from "next/headers";

const COOKIE = "dian_connection";

/**
 * The Croma connection this browser uses. In your own product, store the
 * connection id next to your user instead: it is how every later query knows
 * whose DIAN account to read.
 */
export async function getConnectionId(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function setConnectionId(id: string): Promise<void> {
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearConnectionId(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
