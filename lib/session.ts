import "server-only";

import { cookies } from "next/headers";

const COOKIE = "dian_session";

export type Session = { mode: "demo" } | { mode: "live"; connectionId: string; openedAt: number };

/**
 * Which account this browser is looking at. The playground keeps it in a
 * cookie because it stores nothing; in your product, keep the connection id
 * on your user's record.
 */
export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  if (raw === "demo") return { mode: "demo" };
  const [connectionId, openedAt] = raw.split(".");
  return connectionId?.startsWith("conn_") ? { mode: "live", connectionId, openedAt: Number(openedAt) || Date.now() } : null;
}

export async function setSession(session: Session): Promise<void> {
  const value = session.mode === "demo" ? "demo" : `${session.connectionId}.${session.openedAt}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
