"use server";

import { z } from "zod";

import { croma } from "@/lib/croma";
import { demo, demoDocument, demoList, demoMonthlyReport, demoProfile } from "@/lib/demo";
import {
  accessRequest,
  accessRequestForm,
  connection,
  connectForm,
  documentList,
  documentRef,
  fullDocument,
  monthInput,
  monthlyReport,
  profile,
  rangeInput,
  type AccessRequestForm,
  type RangeInput,
} from "@/lib/schemas";
import { clearSession, getSession, setSession } from "@/lib/session";
import type { Result } from "@/lib/trace";

const invalid = (error: z.ZodError) => ({ ok: false as const, error: { code: "invalid", message: error.issues[0]?.message ?? "Revisa los datos." }, trace: null });

const noSession = { ok: false as const, error: { code: "no_session", message: "Conecta una cuenta para consultar." }, trace: null };

// ─── Onboarding ─────────────────────────────────────────────────────────────

export async function requestAccess(input: AccessRequestForm) {
  const form = accessRequestForm.safeParse(input);
  if (!form.success) return invalid(form.error);
  const body = {
    document_type: form.data.document_type,
    document_number: form.data.document_number,
    company_nit: form.data.kind === "empresa" ? form.data.company_nit : "",
  };
  return croma("/co/dian-facturacion/access-requests/v1", body, accessRequest);
}

export async function connect(input: { access_link: string; authorized: boolean }) {
  const form = connectForm.safeParse(input);
  if (!form.success) return invalid(form.error);
  // Registering the same account again renews it: the connection keeps its id.
  const result = await croma("/co/dian-facturacion/connections/v1", form.data, connection);
  if (result.ok) await setSession({ mode: "live", connectionId: result.data.id, openedAt: Date.now() });
  return result;
}

export async function startDemo() {
  await setSession({ mode: "demo" });
}

export async function signOut() {
  const session = await getSession();
  await clearSession();
  if (session?.mode === "live" && process.env.CROMA_API_KEY) {
    await fetch(`${process.env.CROMA_API_URL ?? "https://api.croma.run"}/co/dian-facturacion/connections/v1/${session.connectionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.CROMA_API_KEY}` },
    }).catch(() => undefined);
  }
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function listDocuments(direction: "issued" | "received", input: RangeInput): Promise<Result<z.infer<typeof documentList>>> {
  const range = rangeInput.safeParse(input);
  if (!range.success) return invalid(range.error);
  const session = await getSession();
  if (!session) return noSession;
  const path = `/co/dian-facturacion/${direction}-documents/v1`;
  if (session.mode === "demo") return demo(path, { connection_id: "conn_demo", ...range.data }, demoList(direction, range.data.from_date, range.data.to_date));
  return croma(path, { connection_id: session.connectionId, ...range.data }, documentList);
}

export async function getDocument(input: { cufe: string; issued_on: string }): Promise<Result<z.infer<typeof fullDocument>>> {
  const ref = documentRef.safeParse(input);
  if (!ref.success) return invalid(ref.error);
  const session = await getSession();
  if (!session) return noSession;
  const path = "/co/dian-facturacion/document/v1";
  if (session.mode === "demo") return demo(path, { connection_id: "conn_demo", ...ref.data }, demoDocument(ref.data.cufe, ref.data.issued_on));
  return croma(path, { connection_id: session.connectionId, ...ref.data }, fullDocument);
}

export async function getMonthlyReport(input: { year: number; month: number }): Promise<Result<z.infer<typeof monthlyReport>>> {
  const month = monthInput.safeParse(input);
  if (!month.success) return invalid(month.error);
  const session = await getSession();
  if (!session) return noSession;
  const path = "/co/dian-facturacion/monthly-reports/v1";
  if (session.mode === "demo") return demo(path, { connection_id: "conn_demo", ...month.data }, demoMonthlyReport(month.data.year, month.data.month));
  return croma(path, { connection_id: session.connectionId, ...month.data }, monthlyReport);
}

export async function getProfile(): Promise<Result<z.infer<typeof profile>>> {
  const session = await getSession();
  if (!session) return noSession;
  const path = "/co/dian-facturacion/profile/v1";
  if (session.mode === "demo") return demo(path, { connection_id: "conn_demo" }, demoProfile());
  return croma(path, { connection_id: session.connectionId }, profile);
}
