"use client";

import { DownloadIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDocument } from "@/app/actions";
import { ErrorState } from "@/components/states";
import { useQuery } from "@/components/use-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { day, documentLabel, pesos } from "@/lib/format";
import type { FullDocument, ListedDocument } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function DocumentSheet({ document, direction, onClose }: { document: ListedDocument | null; direction: "issued" | "received"; onClose: () => void }) {
  return (
    <Sheet open={document !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-2xl">
        {document ? <DocumentBody key={document.cufe} listed={document} direction={direction} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DocumentBody({ listed, direction }: { listed: ListedDocument; direction: "issued" | "received" }) {
  const doc = useQuery(`document:${listed.cufe}`, "document", () => getDocument({ cufe: listed.cufe, issued_on: listed.issued_on }));
  const [tab, setTab] = useState("detalle");

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-3 border-b border-line px-6 pt-6 pb-5">
        <p className="eyebrow">{listed.document_type}</p>
        <SheetTitle className="text-3xl font-semibold tracking-[-0.04em]">{documentLabel(listed)}</SheetTitle>
        <SheetDescription className="font-mono text-[10.5px] break-all">CUFE {listed.cufe}</SheetDescription>
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div>
            <p className="eyebrow-sm">{direction === "issued" ? "Cliente" : "Proveedor"}</p>
            <p className="mt-1 text-sm font-medium">{(direction === "issued" ? listed.recipient : listed.issuer).name}</p>
          </div>
          <p className="text-2xl font-semibold tracking-[-0.03em] tabular-nums">{pesos(listed.total)}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="flex-1 gap-0">
        <div className="flex items-center justify-between border-b border-line px-4">
          <TabsList variant="line" className="h-10">
            <TabsTrigger value="detalle" className="px-3 text-[13px]">
              Detalle
            </TabsTrigger>
            <TabsTrigger value="pdf" className="px-3 text-[13px]" disabled={doc.status === "ok" && !doc.data.pdf_base64}>
              PDF
            </TabsTrigger>
            <TabsTrigger value="xml" className="px-3 text-[13px]" disabled={doc.status === "ok" && !doc.data.xml}>
              XML
            </TabsTrigger>
          </TabsList>
          {doc.status === "ok" ? <Downloads doc={doc.data} name={documentLabel(listed)} /> : null}
        </div>

        {doc.status === "loading" ? <DetailSkeleton /> : null}
        {doc.status === "error" ? <ErrorState code={doc.code} message={doc.message} /> : null}
        {doc.status === "ok" && !doc.data.found ? <ErrorState code="not_found" message="La cuenta no tiene ese documento en esa fecha." /> : null}
        {doc.status === "ok" && doc.data.found ? (
          <>
            <TabsContent value="detalle">
              <Detail doc={doc.data} />
            </TabsContent>
            <TabsContent value="pdf" className="p-4">
              {doc.data.pdf_base64 ? <PdfPreview base64={doc.data.pdf_base64} /> : null}
            </TabsContent>
            <TabsContent value="xml">
              <pre className="max-h-[70vh] overflow-auto bg-secondary/30 p-5 font-mono text-[11px] leading-relaxed">{doc.data.xml}</pre>
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </div>
  );
}

function Detail({ doc }: { doc: FullDocument }) {
  return (
    <div>
      <div className="grid grid-cols-2 border-b border-line">
        <Cell label="Emisor" value={doc.issuer?.name} sub={doc.issuer?.nit} />
        <Cell label="Receptor" value={doc.recipient?.name} sub={doc.recipient?.nit} className="border-l border-line" />
        <Cell label="Expedición" value={day(doc.issued_on)} sub={doc.issued_at?.slice(11, 16)} className="border-t border-line" />
        <Cell label="Vencimiento" value={day(doc.due_on)} sub={doc.payment_form === "2" ? "Crédito" : "Contado"} className="border-t border-l border-line" />
      </div>

      {doc.lines.length > 0 ? (
        <div className="border-b border-line">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-line px-6 py-2.5">
            <span className="eyebrow-sm">Descripción</span>
            <span className="eyebrow-sm w-12 text-right">Cant.</span>
            <span className="eyebrow-sm w-28 text-right">Total</span>
          </div>
          {doc.lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-line px-6 py-3 text-sm last:border-0">
              <span>
                {line.description}
                <span className="block font-mono text-[10.5px] text-muted-foreground">
                  {line.code} · {pesos(line.unit_price)} c/u
                </span>
              </span>
              <span className="w-12 text-right tabular-nums">{line.quantity}</span>
              <span className="w-28 text-right tabular-nums">{pesos(line.line_total)}</span>
            </div>
          ))}
          <div className="space-y-1.5 border-t border-line px-6 py-4 text-sm">
            {doc.taxes.map((tax) => (
              <div key={tax.name} className="flex justify-between text-muted-foreground">
                <span>{tax.name}</span>
                <span className="tabular-nums">{pesos(tax.value)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{pesos(doc.total)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2">
        <List title="Validaciones de la DIAN" empty="Sin observaciones." items={doc.validations.map((v) => ({ label: v.name ?? "–", value: v.result ?? "" }))} />
        <List
          title="Eventos RADIAN"
          empty="Sin eventos registrados."
          items={doc.events.map((e) => ({ label: e.name ?? e.code ?? "–", value: day(e.date) }))}
          className="border-t border-line sm:border-t-0 sm:border-l"
        />
      </div>
      {doc.legitimate_holder ? (
        <p className="border-t border-line px-6 py-4 text-xs text-muted-foreground">
          Legítimo tenedor: <span className="text-foreground">{doc.legitimate_holder}</span>
        </p>
      ) : null}
    </div>
  );
}

function Cell({ label, value, sub, className }: { label: string; value: string | null | undefined; sub?: string | null; className?: string }) {
  return (
    <div className={cn("space-y-1 px-6 py-4", className)}>
      <p className="eyebrow-sm">{label}</p>
      <p className="text-sm font-medium">{value ?? "–"}</p>
      {sub ? <p className="font-mono text-[10.5px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function List({ title, items, empty, className }: { title: string; items: { label: string; value: string }[]; empty: string; className?: string }) {
  return (
    <div className={cn("space-y-3 px-6 py-5", className)}>
      <p className="eyebrow-sm">{title}</p>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      {items.map((item, i) => (
        <div key={i} className="space-y-0.5 border-l-2 border-line pl-3 text-sm">
          <p>{item.label}</p>
          <p className="font-mono text-[10.5px] text-muted-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function usePdfUrl(base64: string | null) {
  const url = useMemo(() => {
    if (!base64) return null;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  }, [base64]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}

function PdfPreview({ base64 }: { base64: string }) {
  const url = usePdfUrl(base64);
  return url ? <iframe title="PDF del documento" src={url} className="h-[70vh] w-full border border-line bg-white" /> : null;
}

function Downloads({ doc, name }: { doc: FullDocument; name: string }) {
  const pdf = usePdfUrl(doc.pdf_base64);
  const xml = useMemo(() => (doc.xml ? URL.createObjectURL(new Blob([doc.xml], { type: "application/xml" })) : null), [doc.xml]);
  useEffect(() => () => void (xml && URL.revokeObjectURL(xml)), [xml]);
  return (
    <div className="flex gap-1.5">
      {pdf ? (
        <Button size="xs" variant="outline" render={<a href={pdf} download={`${name}.pdf`} />}>
          <DownloadIcon /> PDF
        </Button>
      ) : null}
      {xml ? (
        <Button size="xs" variant="outline" render={<a href={xml} download={`${name}.xml`} />}>
          <DownloadIcon /> XML
        </Button>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
      <p className="font-mono text-[11px] text-muted-foreground">Abriendo el documento en la DIAN…</p>
    </div>
  );
}
