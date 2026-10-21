"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { useState } from "react";

import { listDocuments } from "@/app/actions";
import { ErrorState } from "@/components/states";
import { useQuery } from "@/components/use-query";
import { Skeleton } from "@/components/ui/skeleton";
import { monthName, pesos, pesosCompact, today } from "@/lib/format";
import type { ListedDocument } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export const yearRange = () => ({ from_date: `${today().slice(0, 4)}-01-01`, to_date: today() });
export const rangeKey = (direction: string, range: { from_date: string; to_date: string }) => `${direction}:${range.from_date}:${range.to_date}`;

const signed = (d: ListedDocument) => (d.document_type_code === "91" ? -1 : d.document_type_code === "01" || d.document_type_code === "92" ? 1 : 0) * (d.total ?? 0);
const vat = (d: ListedDocument) => (d.document_type_code === "91" ? -1 : 1) * (d.taxes?.iva ?? 0);

export function OverviewPanel({ onOpen }: { onOpen: (direction: "issued" | "received") => void }) {
  const range = yearRange();
  const issued = useQuery(rangeKey("issued", range), "issued-documents", () => listDocuments("issued", range));
  const received = useQuery(rangeKey("received", range), "received-documents", () => listDocuments("received", range));

  if (issued.status === "error") return <ErrorState code={issued.code} message={issued.message} />;
  if (received.status === "error") return <ErrorState code={received.code} message={received.message} />;
  if (issued.status === "loading" || received.status === "loading") return <OverviewSkeleton />;

  const sales = issued.data.documents.reduce((s, d) => s + signed(d), 0);
  const purchases = received.data.documents.reduce((s, d) => s + signed(d), 0);
  const vatOut = issued.data.documents.reduce((s, d) => s + vat(d), 0);
  const vatIn = received.data.documents.reduce((s, d) => s + vat(d), 0);
  const currentMonth = Number(range.to_date.slice(5, 7));
  const months = Array.from({ length: currentMonth }, (_, i) => {
    const prefix = `${range.to_date.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`;
    return {
      month: i + 1,
      sales: issued.data.documents.filter((d) => d.issued_on.startsWith(prefix)).reduce((s, d) => s + signed(d), 0),
      purchases: received.data.documents.filter((d) => d.issued_on.startsWith(prefix)).reduce((s, d) => s + signed(d), 0),
    };
  });

  return (
    <div>
      <div className="grid grid-cols-2 border-b border-line lg:grid-cols-4">
        <Kpi label="Ventas" value={pesos(sales)} hint={`${issued.data.count} documentos emitidos`} accent />
        <Kpi label="Compras" value={pesos(purchases)} hint={`${received.data.count} documentos recibidos`} className="border-l border-line" />
        <Kpi label="IVA generado" value={pesos(vatOut)} hint="en ventas" className="border-t border-line lg:border-t-0 lg:border-l" />
        <Kpi label="IVA descontable" value={pesos(vatIn)} hint={`neto ${pesos(vatOut - vatIn)}`} className="border-t border-l border-line lg:border-t-0" />
      </div>

      <div className="border-b border-line px-6 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Mes a mes · {range.to_date.slice(0, 4)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Facturas menos notas crédito, por fecha de expedición.</p>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 bg-agent" /> Ventas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 bg-foreground/25" /> Compras
            </span>
          </div>
        </div>
        <MonthlyChart months={months} />
      </div>

      <div className="grid lg:grid-cols-2">
        <Ranking title="Principales clientes" rows={rank(issued.data.documents, "recipient")} onMore={() => onOpen("issued")} />
        <Ranking title="Principales proveedores" rows={rank(received.data.documents, "issuer")} onMore={() => onOpen("received")} className="border-t border-line lg:border-t-0 lg:border-l" muted />
      </div>
    </div>
  );
}

function rank(documents: ListedDocument[], side: "issuer" | "recipient") {
  const totals = new Map<string, { name: string; nit: string | null; total: number; count: number }>();
  for (const d of documents) {
    const value = signed(d);
    if (!value) continue;
    const party = d[side];
    const key = party.nit ?? party.name ?? "?";
    const row = totals.get(key) ?? { name: party.name ?? "Sin nombre", nit: party.nit, total: 0, count: 0 };
    row.total += value;
    row.count++;
    totals.set(key, row);
  }
  return [...totals.values()].sort((a, b) => b.total - a.total).slice(0, 5);
}

function Kpi({ label, value, hint, accent, className }: { label: string; value: string; hint: string; accent?: boolean; className?: string }) {
  return (
    <div className={cn("space-y-2 px-6 py-5 sm:px-8", className)}>
      <p className="eyebrow-sm flex items-center gap-1.5">
        {accent ? <span className="size-1.5 bg-agent" /> : null}
        {label}
      </p>
      <p className="truncate text-lg font-semibold tracking-[-0.03em] tabular-nums sm:text-2xl">{value}</p>
      <p className="truncate font-mono text-[10.5px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function MonthlyChart({ months }: { months: { month: number; sales: number; purchases: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...months.flatMap((m) => [m.sales, m.purchases]));
  const ticks = [1, 0.5, 0];
  return (
    <div className="relative">
      <div className="flex h-56 gap-2 sm:gap-3">
        <div className="flex w-12 shrink-0 flex-col justify-between pb-6 text-right font-mono text-[9.5px] text-muted-foreground">
          {ticks.map((t) => (
            <span key={t}>{t === 0 ? "0" : pesosCompact(max * t)}</span>
          ))}
        </div>
        <div className="relative flex flex-1 items-stretch gap-1 sm:gap-2">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t) => (
              <span key={t} className="h-px bg-line" />
            ))}
          </div>
          {months.map((m, i) => (
            <div
              key={m.month}
              className="relative flex flex-1 flex-col"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className={cn("relative flex flex-1 items-end justify-center gap-[3px] transition-colors", hover === i && "bg-secondary/50")}>
                <Bar value={m.sales} max={max} className="bg-agent" delay={i * 40} />
                <Bar value={m.purchases} max={max} className="bg-foreground/25" delay={i * 40 + 20} />
              </div>
              <span className={cn("mt-2 h-4 text-center font-mono text-[9.5px] uppercase", hover === i ? "text-foreground" : "text-muted-foreground")}>{monthName(m.month)}</span>
              {hover === i ? (
                <div className="absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 border border-line bg-popover px-3 py-2 shadow-sm">
                  <p className="eyebrow-sm mb-1.5">{monthName(m.month, "long")}</p>
                  <p className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Ventas</span>
                    <span className="tabular-nums">{pesos(m.sales)}</span>
                  </p>
                  <p className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Compras</span>
                    <span className="tabular-nums">{pesos(m.purchases)}</span>
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bar({ value, max, className, delay }: { value: number; max: number; className: string; delay: number }) {
  return (
    <span
      className={cn("w-full max-w-5 origin-bottom animate-grow", className)}
      style={{ height: `${Math.max(value > 0 ? 2 : 0, (value / max) * 100)}%`, animationDelay: `${delay}ms` }}
    />
  );
}

function Ranking({
  title,
  rows,
  onMore,
  muted,
  className,
}: {
  title: string;
  rows: { name: string; nit: string | null; total: number; count: number }[];
  onMore: () => void;
  muted?: boolean;
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className={cn("px-6 py-6 sm:px-8", className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">{title}</p>
        <button type="button" onClick={onMore} className="flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground">
          Ver todo <ArrowUpRightIcon className="size-3" />
        </button>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Sin documentos en el año.</p> : null}
      <ol className="space-y-3.5">
        {rows.map((row, i) => (
          <li key={`${row.nit}-${i}`} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-2 font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                {row.name}
              </span>
              <span className="shrink-0 tabular-nums">{pesos(row.total)}</span>
            </div>
            <div className="h-1 bg-secondary">
              <div className={cn("h-1 transition-[width] duration-700", muted ? "bg-foreground/30" : "bg-agent")} style={{ width: `${(row.total / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 border-b border-line lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("space-y-3 px-6 py-5 sm:px-8", i > 0 && "border-l border-line")}>
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        ))}
      </div>
      <div className="border-b border-line px-6 py-6 sm:px-8">
        <Skeleton className="mb-6 h-2.5 w-32" />
        <div className="flex h-56 items-end gap-3 pl-14">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${25 + ((i * 37) % 60)}%` }} />
          ))}
        </div>
      </div>
      <p className="px-8 py-6 font-mono text-[11px] text-muted-foreground">Leyendo la DIAN en vivo. La primera consulta tarda unos segundos.</p>
    </div>
  );
}
