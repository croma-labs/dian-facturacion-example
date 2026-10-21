"use client";

import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { listDocuments } from "@/app/actions";
import { DocumentSheet } from "@/components/document-sheet";
import { rangeKey, yearRange } from "@/components/overview-panel";
import { EmptyState, ErrorState } from "@/components/states";
import { useQuery } from "@/components/use-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { day, documentLabel, pesos, shiftDays, today } from "@/lib/format";
import type { ListedDocument } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const PRESETS = {
  year: { label: "Este año", range: yearRange },
  "90d": { label: "90 días", range: () => ({ from_date: shiftDays(today(), -89), to_date: today() }) },
  last: {
    label: "Año anterior",
    range: () => {
      const y = Number(today().slice(0, 4)) - 1;
      return { from_date: `${y}-01-01`, to_date: `${y}-12-31` };
    },
  },
} as const;

type Preset = keyof typeof PRESETS;

export function DocumentsPanel({ direction }: { direction: "issued" | "received" }) {
  const [preset, setPreset] = useState<Preset>("year");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [open, setOpen] = useState<ListedDocument | null>(null);
  const range = PRESETS[preset].range();
  const list = useQuery(rangeKey(direction, range), `${direction}-documents`, () => listDocuments(direction, range));

  const types = useMemo(() => (list.status === "ok" ? list.data.by_type : []), [list]);
  const rows = useMemo(() => {
    if (list.status !== "ok") return [];
    const q = search.trim().toLowerCase();
    return list.data.documents.filter((d) => {
      if (type !== "all" && d.document_type !== type) return false;
      if (!q) return true;
      const party = direction === "issued" ? d.recipient : d.issuer;
      return [documentLabel(d), party.name, party.nit, d.cufe].some((v) => v?.toLowerCase().includes(q));
    });
  }, [list, search, type, direction]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3 sm:px-8">
        <ToggleGroup value={[preset]} onValueChange={(v) => v[0] && setPreset(v[0] as Preset)} variant="outline" size="sm" spacing={0}>
          {(Object.keys(PRESETS) as Preset[]).map((key) => (
            <ToggleGroupItem key={key} value={key} className="px-3 text-xs">
              {PRESETS[key].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={direction === "issued" ? "Buscar por cliente, NIT, número o CUFE" : "Buscar por proveedor, NIT, número o CUFE"}
            className="h-7 pl-8 text-xs"
          />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {day(range.from_date)} → {day(range.to_date)}
        </span>
      </div>

      {types.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-line px-6 py-2.5 sm:px-8">
          <TypeChip active={type === "all"} onClick={() => setType("all")} label="Todos" count={list.status === "ok" ? list.data.count : 0} />
          {types.map((t) => (
            <TypeChip key={t.document_type} active={type === t.document_type} onClick={() => setType(t.document_type)} label={t.document_type} count={t.count} />
          ))}
        </div>
      ) : null}

      {list.status === "loading" ? <TableSkeleton /> : null}
      {list.status === "error" ? <ErrorState code={list.code} message={list.message} /> : null}
      {list.status === "ok" && rows.length === 0 ? (
        <EmptyState title="Sin documentos" body={search || type !== "all" ? "Nada coincide con el filtro." : "No hay documentos en este rango de fechas."} />
      ) : null}
      {list.status === "ok" && rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="pl-6 sm:pl-8">
                <span className="eyebrow-sm">Fecha</span>
              </TableHead>
              <TableHead>
                <span className="eyebrow-sm">Número</span>
              </TableHead>
              <TableHead>
                <span className="eyebrow-sm">{direction === "issued" ? "Cliente" : "Proveedor"}</span>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <span className="eyebrow-sm">Tipo</span>
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                <span className="eyebrow-sm">IVA</span>
              </TableHead>
              <TableHead className="pr-6 text-right sm:pr-8">
                <span className="eyebrow-sm">Total</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((doc) => {
              const party = direction === "issued" ? doc.recipient : doc.issuer;
              const credit = doc.document_type_code === "91";
              return (
                <TableRow key={doc.cufe} onClick={() => setOpen(doc)} className="cursor-pointer border-line">
                  <TableCell className="pl-6 font-mono text-xs whitespace-nowrap text-muted-foreground sm:pl-8">{day(doc.issued_on)}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{documentLabel(doc)}</TableCell>
                  <TableCell className="max-w-72">
                    <span className="block truncate">{party.name ?? "–"}</span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">{party.nit}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={cn("font-normal", credit && "border-destructive/30 text-destructive")}>
                      {doc.document_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">{pesos(doc.taxes?.iva)}</TableCell>
                  <TableCell className={cn("pr-6 text-right font-medium tabular-nums sm:pr-8", credit && "text-destructive")}>
                    {credit ? "−" : ""}
                    {pesos(doc.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      <DocumentSheet document={open} direction={direction} onClose={() => setOpen(null)} />
    </div>
  );
}

function TypeChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border px-2 py-1 text-[11px] transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-line text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("font-mono text-[10px]", active ? "text-background/70" : "text-muted-foreground")}>{count}</span>
    </button>
  );
}

function TableSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-line px-8 py-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
