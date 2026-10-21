"use client";

import { useState } from "react";

import { getMonthlyReport, getProfile } from "@/app/actions";
import { EmptyState, ErrorState } from "@/components/states";
import { useQuery } from "@/components/use-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { day, monthName, pesos, today } from "@/lib/format";
import type { MonthlyReport } from "@/lib/schemas";
import { cn } from "@/lib/utils";

function lastMonths(count: number) {
  const [y, m] = today().split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y!, m! - 2 - i, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, key: d.toISOString().slice(0, 7) };
  });
}

export function ReportPanel() {
  const months = lastMonths(12);
  const [selected, setSelected] = useState(months[0]!.key);
  const { year, month } = months.find((m) => m.key === selected)!;
  const report = useQuery(`report:${selected}`, "monthly-reports", () => getMonthlyReport({ year, month }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3 sm:px-8">
        <p className="text-sm text-muted-foreground">El reporte que la DIAN expide cada mes a quien factura electrónicamente.</p>
        <Select value={selected} onValueChange={(v) => setSelected(String(v))}>
          <SelectTrigger size="sm" className="w-44 capitalize">
            <SelectValue>{(value: string) => label(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.key} value={m.key} className="capitalize">
                {label(m.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {report.status === "loading" ? <BlockSkeleton /> : null}
      {report.status === "error" ? <ErrorState code={report.code} message={report.message} /> : null}
      {report.status === "ok" && !report.data.available ? <EmptyState title="Aún no hay reporte" body="La DIAN suele expedirlo en las primeras semanas del mes siguiente." /> : null}
      {report.status === "ok" && report.data.available ? (
        <div>
          <div className="grid grid-cols-2 border-b border-line">
            <Total label="Emitido en el mes" amount={sum(report.data.documents, "issued", "month_amount")} count={sum(report.data.documents, "issued", "month_count")} accent />
            <Total
              label="Recibido en el mes"
              amount={sum(report.data.documents, "received", "month_amount")}
              count={sum(report.data.documents, "received", "month_count")}
              className="border-l border-line"
            />
          </div>
          <div className="grid grid-cols-3 border-b border-line">
            <Fact label="Referencia" value={report.data.reference} mono />
            <Fact label="Expedido" value={day(report.data.dated_on)} className="border-l border-line" />
            <Fact label="Corte" value={day(report.data.cutoff_date)} className="border-l border-line" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="py-3 pr-4 pl-6 font-normal sm:pl-8">
                    <span className="eyebrow-sm">Tipo</span>
                  </th>
                  {["Emitidos mes", "Valor emitido", "Recibidos mes", "Valor recibido", "Emitido en el año"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-normal last:pr-6 sm:last:pr-8">
                      <span className="eyebrow-sm">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.data.documents.map((row) => (
                  <tr key={row.document_type} className="border-b border-line">
                    <td className="py-3.5 pr-4 pl-6 sm:pl-8">{row.document_type}</td>
                    <td className="px-4 text-right tabular-nums">{row.issued.month_count ?? "–"}</td>
                    <td className="px-4 text-right tabular-nums">{pesos(row.issued.month_amount)}</td>
                    <td className="px-4 text-right tabular-nums">{row.received.month_count ?? "–"}</td>
                    <td className="px-4 text-right tabular-nums">{pesos(row.received.month_amount)}</td>
                    <td className="px-4 pr-6 text-right tabular-nums text-muted-foreground sm:pr-8">{pesos(row.issued.year_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ReportRow = MonthlyReport["documents"][number];
const sum = (rows: ReportRow[], side: "issued" | "received", field: "month_amount" | "month_count") => rows.reduce((s, row) => s + (row[side][field] ?? 0), 0);

function Total({ label, amount, count, accent, className }: { label: string; amount: number; count: number; accent?: boolean; className?: string }) {
  return (
    <div className={cn("space-y-2 px-6 py-6 sm:px-8", className)}>
      <p className="eyebrow-sm flex items-center gap-1.5">
        {accent ? <span className="size-1.5 bg-agent" /> : null}
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-[-0.03em] tabular-nums sm:text-3xl">{pesos(amount)}</p>
      <p className="font-mono text-[10.5px] text-muted-foreground">{count} documentos</p>
    </div>
  );
}

const label = (key: string) => `${monthName(Number(key.slice(5, 7)), "long")} ${key.slice(0, 4)}`;

export function ProfilePanel() {
  const profile = useQuery("profile", "profile", () => getProfile());
  if (profile.status === "loading") return <BlockSkeleton />;
  if (profile.status === "error") return <ErrorState code={profile.code} message={profile.message} />;
  const p = profile.data;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-6 py-6 sm:px-8">
        <div>
          <p className="eyebrow">Contribuyente</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{p.business_name ?? p.name}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">NIT {p.nit}</p>
        </div>
        <span className={cn("flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase", p.status === "Habilitado" ? "border-positive/40 text-positive" : "border-line text-muted-foreground")}>
          <span className={cn("size-1.5", p.status === "Habilitado" ? "bg-positive" : "bg-muted-foreground")} />
          {p.status ?? "Sin estado"}
        </span>
      </div>
      <div className="grid sm:grid-cols-2">
        <Fact label="Correo del RUT" value={p.email} />
        <Fact label="Recepción de facturas" value={p.reception_email} className="border-t border-line sm:border-t-0 sm:border-l" />
      </div>
      <Section title="Representantes legales">
        {p.legal_representatives.map((r, i) => (
          <Row key={i} label={r.name ?? "–"} value={r.document_number ?? ""} />
        ))}
      </Section>
      <Section title="Software de facturación">
        {p.operation_modes.map((m, i) => (
          <Row key={i} label={m.software ?? "–"} value={`${m.mode ?? ""} · desde ${day(m.registered_on)}`} />
        ))}
      </Section>
      <Section title="Rangos de numeración">
        {p.numbering_ranges.map((r, i) => (
          <div key={i} className="grid gap-1 border-b border-line py-3 last:border-0 sm:grid-cols-[1fr_auto]">
            <span className="text-sm">
              <span className="font-medium">{r.prefix}</span> {r.from_number} → {r.to_number}
              <span className="ml-2 text-muted-foreground">{r.document_type}</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Res. {r.resolution} · vence {day(r.expires_on)}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Fact({ label, value, mono, className }: { label: string; value: string | null | undefined; mono?: boolean; className?: string }) {
  return (
    <div className={cn("space-y-1.5 px-6 py-5 sm:px-8", className)}>
      <p className="eyebrow-sm">{label}</p>
      <p className={cn("truncate text-sm", mono && "font-mono text-xs")}>{value || "–"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line px-6 py-5 sm:px-8">
      <p className="eyebrow mb-3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-line py-3 text-sm last:border-0">
      <span>{label}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{value}</span>
    </div>
  );
}

function BlockSkeleton() {
  return (
    <div className="space-y-4 px-8 py-8">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
