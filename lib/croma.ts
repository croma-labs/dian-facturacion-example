import "server-only";

import type { z } from "zod";

import { apiError } from "@/lib/schemas";
import type { Result, Trace } from "@/lib/trace";

const BASE_URL = process.env.CROMA_API_URL ?? "https://api.croma.run";
const PREVIEW_CHARS = 6_000;

/**
 * POST to a Croma endpoint, validate `data` with `schema`, and return it with
 * a trace for the inspector.
 *
 * Slow lookups are async jobs: Croma waits inline up to `Prefer: wait=55` and
 * answers 200, or answers 202 with a job to poll until it finishes.
 */
export async function croma<S extends z.ZodType>(path: string, body: Record<string, unknown>, schema: S): Promise<Result<z.infer<S>>> {
  const key = process.env.CROMA_API_KEY;
  const started = Date.now();
  const at = new Date().toISOString();
  if (!key) return { ok: false, error: { code: "missing_api_key", message: "Configura CROMA_API_KEY en .env.local." }, trace: null };
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  let res: Response;
  let json: unknown;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: { ...headers, Prefer: "wait=55" }, body: JSON.stringify(body), cache: "no-store" });
    json = await res.json().catch(() => null);
    while (res.status === 202 || isRunning(json)) {
      const statusUrl = (json as { job: { status_url: string } }).job.status_url;
      await new Promise((resolve) => setTimeout(resolve, Number(res.headers.get("Retry-After") ?? 2) * 1000));
      res = await fetch(statusUrl, { headers, cache: "no-store" });
      json = await res.json().catch(() => null);
    }
  } catch {
    return { ok: false, error: { code: "network", message: "No pudimos llegar a la API. Intenta de nuevo." }, trace: null };
  }

  const trace: Trace = {
    id: crypto.randomUUID(),
    at,
    method: "POST",
    path,
    body: redact(body),
    status: res.status,
    ms: Date.now() - started,
    response: preview(json),
    demo: false,
  };

  const failed = apiError.safeParse(json);
  if (!res.ok || failed.success) {
    const error = failed.success ? failed.data.error : { code: "http_" + res.status, message: res.statusText };
    return { ok: false, error, trace };
  }
  const job = json as { job?: { status: string }; error?: { code: string; message: string } } | null;
  if (job?.job && job.job.status !== "completed") {
    return { ok: false, error: job.error ?? { code: job.job.status, message: "La consulta no terminó." }, trace };
  }
  const parsed = schema.safeParse((json as { data?: unknown }).data);
  if (!parsed.success) {
    console.error("Unexpected response shape", path, parsed.error.issues.slice(0, 5));
    return { ok: false, error: { code: "unexpected_response", message: "La respuesta no tiene la forma esperada." }, trace };
  }
  return { ok: true, data: parsed.data, trace };
}

function isRunning(json: unknown): boolean {
  const status = (json as { job?: { status?: string } } | null)?.job?.status;
  return status === "queued" || status === "running";
}

/** The access link opens the account: never show it whole, not even in a dev tool. */
export function redact(body: Record<string, unknown>): Record<string, unknown> {
  if (typeof body.access_link !== "string") return body;
  return { ...body, access_link: body.access_link.replace(/token=[^&]+/, "token=••••••••") };
}

/** A readable copy of the response: long files elided, the rest cut to a preview. */
export function preview(json: unknown): string {
  const text = JSON.stringify(
    json,
    (key, value) => {
      if ((key === "pdf_base64" || key === "xml") && typeof value === "string") return `‹${Math.round(value.length / 1024)} KB›`;
      return value;
    },
    2,
  );
  if (!text) return "";
  return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}\n…` : text;
}
