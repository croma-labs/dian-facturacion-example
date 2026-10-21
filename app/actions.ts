"use server";

import { redirect } from "next/navigation";

import { croma, CromaError } from "@/lib/croma";
import { clearConnectionId, getConnectionId, setConnectionId } from "@/lib/session";
import type { AccessRequest, Connection, DocumentType } from "@/lib/types";

export type RequestAccessState =
  | { status: "idle" }
  | { status: "sent"; result: AccessRequest }
  | { status: "error"; message: string };

export async function requestAccess(_: RequestAccessState, form: FormData): Promise<RequestAccessState> {
  const kind = form.get("kind") === "persona" ? "persona" : "empresa";
  const documentNumber = String(form.get("document_number") ?? "").replace(/\D/g, "");
  const companyNit = kind === "empresa" ? String(form.get("company_nit") ?? "").replace(/\D/g, "") : "";
  if (!documentNumber) return { status: "error", message: "Escribe el número de documento." };
  if (kind === "empresa" && !companyNit) return { status: "error", message: "Escribe el NIT de la empresa, sin dígito de verificación." };

  try {
    const result = await croma<AccessRequest>("/co/dian-facturacion/access-requests/v1", {
      document_type: (form.get("document_type") as DocumentType | null) ?? "CC",
      document_number: documentNumber,
      company_nit: companyNit,
    });
    if (!result.sent) return { status: "error", message: result.message ?? "La DIAN no envió el enlace. Revisa los datos e intenta de nuevo." };
    return { status: "sent", result };
  } catch (error) {
    return { status: "error", message: describe(error) };
  }
}

export type ConnectState = { status: "idle" } | { status: "error"; message: string };

export async function connect(_: ConnectState, form: FormData): Promise<ConnectState> {
  const accessLink = String(form.get("access_link") ?? "").trim();
  if (!accessLink.startsWith("https://")) return { status: "error", message: "Pega el enlace completo del correo de la DIAN." };
  if (form.get("authorized") !== "on") return { status: "error", message: "Confirma que eres el titular de la cuenta o tienes su autorización." };

  try {
    // Registering the same account again renews it: the connection keeps its id.
    const connection = await croma<Connection>("/co/dian-facturacion/connections/v1", {
      access_link: accessLink,
      authorized: true,
    });
    await setConnectionId(connection.id);
  } catch (error) {
    return { status: "error", message: describe(error) };
  }
  redirect("/panel");
}

export async function disconnect(): Promise<void> {
  const id = await getConnectionId();
  if (id && process.env.CROMA_API_KEY) {
    await fetch(`https://api.croma.run/co/dian-facturacion/connections/v1/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.CROMA_API_KEY}` },
    }).catch(() => undefined);
  }
  await clearConnectionId();
  redirect("/");
}

function describe(error: unknown): string {
  if (!(error instanceof CromaError)) return "Algo salió mal. Intenta de nuevo.";
  switch (error.code) {
    case "connection_rejected":
      return "La DIAN ya no acepta ese enlace. Solicita uno nuevo: dura 60 minutos.";
    case "missing_api_key":
      return error.message;
    case "invalid_param":
    case "invalid_request":
      return error.message;
    case "upstream_unavailable":
    case "timeout":
      return "La DIAN no respondió a tiempo. Intenta de nuevo en un momento.";
    default:
      return error.message || "Algo salió mal. Intenta de nuevo.";
  }
}
