import "server-only";

const BASE_URL = process.env.CROMA_API_URL ?? "https://api.croma.run";

export class CromaError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface JobEnvelope<T> {
  job: { id: string; status: string; status_url: string };
  data: T | null;
  error: { code: string; message: string } | null;
}

function headers(): HeadersInit {
  const key = process.env.CROMA_API_KEY;
  if (!key) throw new CromaError(500, "missing_api_key", "Configura CROMA_API_KEY en .env.local");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function fail(res: Response): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new CromaError(res.status, body?.error?.code ?? "unknown", body?.error?.message ?? res.statusText);
}

/**
 * POST to a Croma endpoint and return its `data`.
 *
 * Slow lookups are async jobs: Croma waits inline up to `Prefer: wait=55` and
 * answers 200, or answers 202 with a job to poll until it finishes.
 */
export async function croma<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...headers(), Prefer: "wait=55" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 202) {
    const { job } = (await res.json()) as JobEnvelope<T>;
    return poll<T>(job.status_url);
  }
  if (!res.ok) return fail(res);
  const { data } = (await res.json()) as { data: T };
  return data;
}

async function poll<T>(statusUrl: string): Promise<T> {
  for (;;) {
    const res = await fetch(statusUrl, { headers: headers(), cache: "no-store" });
    if (!res.ok) return fail(res);
    const envelope = (await res.json()) as JobEnvelope<T>;
    if (envelope.job.status === "completed") return envelope.data as T;
    if (["failed", "canceled", "expired"].includes(envelope.job.status)) {
      throw new CromaError(422, envelope.error?.code ?? envelope.job.status, envelope.error?.message ?? envelope.job.status);
    }
    const wait = Number(res.headers.get("Retry-After") ?? 2) * 1000;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}
