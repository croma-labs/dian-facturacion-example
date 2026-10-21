import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ApiCall } from "@/components/api-call";
import { DownloadButtons } from "@/components/download-buttons";
import { Card, Loading, QueryError, Row } from "@/components/views";
import { croma } from "@/lib/croma";
import { date, pesos } from "@/lib/format";
import { getConnectionId } from "@/lib/session";
import type { FullDocument } from "@/lib/types";

export const maxDuration = 300;

export default async function DocumentPage({ searchParams }: { searchParams: Promise<{ cufe?: string; fecha?: string }> }) {
  const connectionId = await getConnectionId();
  if (!connectionId) redirect("/");
  const { cufe, fecha } = await searchParams;
  if (!cufe || !fecha) redirect("/panel");

  return (
    <div className="space-y-6">
      <Link href="/panel" className="text-sm text-muted hover:text-ink">
        ← Volver a las facturas
      </Link>
      <Suspense fallback={<Loading label="Abriendo el documento..." />}>
        <DocumentDetail connectionId={connectionId} cufe={cufe} issuedOn={fecha} />
      </Suspense>
      <ApiCall path="/co/dian-facturacion/document/v1" body={{ connection_id: "conn_...", cufe: `${cufe.slice(0, 16)}...`, issued_on: fecha }} />
    </div>
  );
}

async function DocumentDetail({ connectionId, cufe, issuedOn }: { connectionId: string; cufe: string; issuedOn: string }) {
  let doc: FullDocument;
  try {
    doc = await croma<FullDocument>("/co/dian-facturacion/document/v1", { connection_id: connectionId, cufe, issued_on: issuedOn });
  } catch (error) {
    return <QueryError error={error} />;
  }
  if (!doc.found) {
    return <p className="rounded-xl border border-line bg-white p-10 text-center text-sm text-muted">La cuenta no tiene ese documento en esa fecha.</p>;
  }

  const name = [doc.series, doc.number].filter(Boolean).join("") || cufe.slice(0, 12);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{doc.document_type}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 break-all font-mono text-[11px] text-muted">CUFE {doc.cufe}</p>
        </div>
        <DownloadButtons name={name} xml={doc.xml} pdfBase64={doc.pdf_base64} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Emisor">
          <Row label="Nombre" value={doc.issuer?.name} />
          <Row label="NIT" value={doc.issuer?.nit} />
        </Card>
        <Card title="Receptor">
          <Row label="Nombre" value={doc.recipient?.name} />
          <Row label="NIT" value={doc.recipient?.nit} />
        </Card>
        <Card title="Fechas">
          <Row label="Expedición" value={date(doc.issued_on)} />
          <Row label="Vencimiento" value={date(doc.due_on)} />
          <Row label="Legítimo tenedor" value={doc.legitimate_holder} />
        </Card>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 text-right font-medium">Cantidad</th>
              <th className="px-4 py-3 text-right font-medium">Valor unitario</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((line, index) => (
              <tr key={index} className="border-b border-line">
                <td className="px-4 py-3">{line.description ?? "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {line.quantity ?? "-"} {line.unit ?? ""}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{pesos(line.unit_price)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{pesos(line.line_total)}</td>
              </tr>
            ))}
            {doc.taxes.map((tax) => (
              <tr key={tax.name} className="text-muted">
                <td colSpan={3} className="px-4 py-2 text-right">
                  {tax.name}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{pesos(tax.value)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-medium">
                Total
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{pesos(doc.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Validaciones de la DIAN">
          {doc.validations.length === 0 ? <p className="text-muted">Sin observaciones.</p> : null}
          {doc.validations.map((v, index) => (
            <Row key={index} label={v.name ?? "-"} value={v.result} />
          ))}
        </Card>
        <Card title="Eventos (RADIAN)">
          {doc.events.length === 0 ? <p className="text-muted">Sin eventos registrados.</p> : null}
          {doc.events.map((e, index) => (
            <Row key={index} label={e.name ?? e.code ?? "-"} value={date(e.date)} />
          ))}
        </Card>
      </div>
    </div>
  );
}
