import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// Abuse protection for a public deploy, active when the Upstash env vars are
// set. Asking for access makes DIAN send an email, so it gets the tightest
// limit; live queries get a looser one. Sample data is never limited.
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

const limiters = redis
  ? {
      access: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), prefix: "dian-playground:access" }),
      live: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(40, "10 m"), prefix: "dian-playground:live" }),
    }
  : null;

const MESSAGES = {
  access: "Llegaste al límite de solicitudes de acceso por ahora. Intenta de nuevo en una hora.",
  live: "Demasiadas consultas seguidas. Espera unos minutos e intenta de nuevo.",
};

/** `null` when the call may go ahead, otherwise the error to show. */
export async function limit(kind: keyof typeof MESSAGES): Promise<{ code: string; message: string } | null> {
  if (!limiters) return null;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { success } = await limiters[kind].limit(ip);
  return success ? null : { code: "rate_limited", message: MESSAGES[kind] };
}
