import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "dian_session";

export type Session = { mode: "demo" } | { mode: "live"; connectionId: string; openedAt: number };

/**
 * Which account this browser is looking at. The playground keeps it in a
 * signed cookie because it stores nothing; in your product, keep the
 * connection id on your user's record. Every visitor's connection lives under
 * the same API key, so the cookie is signed: editing it to another id fails.
 */
export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  const value = raw.slice(0, dot);
  if (dot < 0 || !verify(value, raw.slice(dot + 1))) return null;
  if (value === "demo") return { mode: "demo" };
  const [connectionId, openedAt] = value.split(":");
  return connectionId?.startsWith("conn_") ? { mode: "live", connectionId, openedAt: Number(openedAt) || Date.now() } : null;
}

export async function setSession(session: Session): Promise<void> {
  const value = session.mode === "demo" ? "demo" : `${session.connectionId}:${session.openedAt}`;
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
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

function secret(): string {
  return process.env.SESSION_SECRET ?? createHash("sha256").update(`dian-playground:${process.env.CROMA_API_KEY ?? "sample"}`).digest("hex");
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
