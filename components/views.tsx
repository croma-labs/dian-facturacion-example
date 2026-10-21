import Link from "next/link";

import { croma, CromaError } from "@/lib/croma";
import { date, pesos } from "@/lib/format";
import type { DocumentList, MonthlyReport, Profile } from "@/lib/types";

/** Turns a failed query into what the user can do about it. */
export function QueryError({ error }: { error: unknown }) {
  const code = error instanceof CromaError ? error.code : "unknown";
  if (code === "connection_rejected" || code === "connection_required" || code === "connection_not_found") {
    return (
      <div className="rounded-xl border border-warn/30 bg-warn/5 p-6">
        <p className="font-medium text-warn">El acceso a la DIAN terminó</p>
        <p className="mt-1 text-sm text-warn/90">
          La DIAN mantiene el acceso abierto cerca de una hora. Solicita un enlace nuevo y regístralo: la misma conexión se renueva.
        </p>
        <Link href="/?renovar=1" className="mt-4 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white">
          Renovar acceso
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      {error instanceof CromaError ? error.message : "Algo salió mal. Intenta de nuevo."}
    </div>
  );
}

export async function DocumentsView({
  connectionId,
  direction,
  from,
  to,
}: {
  connectionId: string;
  direction: "issued" | "received";
  from: string;
  to: string;
}) {
  let list: DocumentList;
  try {
    list = await croma<DocumentList>(`/co/dian-facturacion/${direction}-documents/v1`, {
      connection_id: connectionId,
      from_date: from,
      to_date: to,
    });
  } catch (error) {
    return <QueryError error={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Documentos" value={String(list.count)} />
        {list.by_type.slice(0, 3).map((row) => (
          <Stat key={row.document_type} label={row.document_type} value={`${row.count} · ${pesos(row.total)}`} />
        ))}
      </div>

      {list.documents.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-10 text-center text-sm text-muted">No hay documentos en este rango.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">{direction === "issued" ? "Cliente" : "Proveedor"}</th>
                <th className="px-4 py-3 text-right font-medium">IVA</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.documents.map((doc) => {
                const counterparty = direction === "issued" ? doc.recipient : doc.issuer;
                return (
                  <tr key={doc.cufe} className="border-b border-line last:border-0 hover:bg-paper">
                    <td className="whitespace-nowrap px-4 py-3">{date(doc.issued_on)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/panel/documento?cufe=${doc.cufe}&fecha=${doc.issued_on}`} className="font-medium underline-offset-4 hover:underline">
                        {[doc.series, doc.number].filter(Boolean).join("") || doc.cufe.slice(0, 10)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{doc.document_type ?? "-"}</td>
                    <td className="max-w-64 truncate px-4 py-3" title={counterparty.name ?? undefined}>
                      {counterparty.name ?? "-"}
                      {counterparty.nit ? <span className="ml-2 font-mono text-xs text-muted">{counterparty.nit}</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{pesos(doc.taxes?.iva)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{pesos(doc.total)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{doc.status ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export async function MonthlyReportView({ connectionId, year, month }: { connectionId: string; year: number; month: number }) {
  let report: MonthlyReport;
  try {
    report = await croma<MonthlyReport>("/co/dian-facturacion/monthly-reports/v1", { connection_id: connectionId, year, month });
  } catch (error) {
    return <QueryError error={error} />;
  }
  if (!report.available) {
    return <p className="rounded-xl border border-line bg-white p-10 text-center text-sm text-muted">La DIAN no ha emitido el reporte de ese mes.</p>;
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Reporte {report.reference} · expedido el {date(report.dated_on)} · corte {date(report.cutoff_date)}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Tipo de documento</th>
              <th className="px-4 py-3 text-right font-medium">Emitidos (mes)</th>
              <th className="px-4 py-3 text-right font-medium">Valor emitido</th>
              <th className="px-4 py-3 text-right font-medium">Recibidos (mes)</th>
              <th className="px-4 py-3 text-right font-medium">Valor recibido</th>
            </tr>
          </thead>
          <tbody>
            {report.documents.map((row) => (
              <tr key={row.document_type} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{row.document_type}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.issued.month_count ?? "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{pesos(row.issued.month_amount)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.received.month_count ?? "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{pesos(row.received.month_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export async function ProfileView({ connectionId }: { connectionId: string }) {
  let profile: Profile;
  try {
    profile = await croma<Profile>("/co/dian-facturacion/profile/v1", { connection_id: connectionId });
  } catch (error) {
    return <QueryError error={error} />;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Contribuyente">
        <Row label="Nombre" value={profile.business_name ?? profile.name} />
        <Row label="NIT" value={profile.nit} />
        <Row label="Estado" value={profile.status} />
        <Row label="Correo de recepción de facturas" value={profile.reception_email} />
      </Card>
      <Card title="Representantes legales">
        {profile.legal_representatives.map((rep, index) => (
          <Row key={index} label={rep.name ?? "-"} value={rep.document_number} />
        ))}
      </Card>
      <Card title="Software de facturación">
        {profile.operation_modes.map((mode, index) => (
          <Row key={index} label={mode.software ?? "-"} value={`${mode.mode ?? ""} · desde ${date(mode.registered_on)}`} />
        ))}
      </Card>
      <Card title="Rangos de numeración">
        {profile.numbering_ranges.map((range, index) => (
          <Row
            key={index}
            label={`${range.prefix ?? ""} ${range.from_number ?? ""} a ${range.to_number ?? ""}`}
            value={`Resolución ${range.resolution ?? "-"} · vence ${date(range.expires_on)}`}
          />
        ))}
      </Card>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value || "-"}</dd>
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-10 text-center">
      <div className="mx-auto size-6 animate-spin rounded-full border-2 border-line border-t-ink" />
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="mt-1 text-xs text-muted">Se lee en vivo de la DIAN; puede tardar unos segundos.</p>
    </div>
  );
}
