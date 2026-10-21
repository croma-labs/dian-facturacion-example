"use client";

import { CheckIcon, ChevronRightIcon, CopyIcon, TerminalSquareIcon } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Result, Trace } from "@/lib/trace";
import { cn } from "@/lib/utils";

interface InspectorState {
  traces: Trace[];
  pending: string[];
  /** Run a server action, record its call, and cache the answer by `key`. */
  run: <T>(key: string, label: string, action: () => Promise<Result<T>>) => Promise<Result<T>>;
  cached: <T>(key: string) => Result<T> | undefined;
  reset: () => void;
  /** The account's access ended: the next query needs a new link. */
  expired: boolean;
  /** Bumps when the cache is cleared, so loaded panels fetch again. */
  generation: number;
}

const InspectorContext = createContext<InspectorState | null>(null);

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [expired, setExpired] = useState(false);
  const [generation, setGeneration] = useState(0);
  const cache = useRef(new Map<string, Result<unknown>>());

  const run = useCallback(async <T,>(key: string, label: string, action: () => Promise<Result<T>>) => {
    setPending((p) => [...p, label]);
    try {
      const result = await action();
      if (result.trace) setTraces((t) => [result.trace!, ...t].slice(0, 50));
      if (result.ok) cache.current.set(key, result);
      else if (result.error.code === "connection_rejected" && label !== "connections") setExpired(true);
      return result;
    } finally {
      setPending((p) => {
        const i = p.indexOf(label);
        return i < 0 ? p : [...p.slice(0, i), ...p.slice(i + 1)];
      });
    }
  }, []);

  const cached = useCallback(<T,>(key: string) => cache.current.get(key) as Result<T> | undefined, []);
  const reset = useCallback(() => {
    cache.current.clear();
    setExpired(false);
    setGeneration((g) => g + 1);
  }, []);

  const value = useMemo(() => ({ traces, pending, run, cached, reset, expired, generation }), [traces, pending, run, cached, reset, expired, generation]);
  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useInspector() {
  const value = useContext(InspectorContext);
  if (!value) throw new Error("useInspector outside InspectorProvider");
  return value;
}

export function InspectorPanel({ className }: { className?: string }) {
  const { traces, pending } = useInspector();
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <TerminalSquareIcon className="size-3.5 text-agent" />
          <span className="eyebrow">Inspector</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{traces.length} llamadas</span>
      </div>
      <p className="border-b border-line px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        Cada llamada sale de tu servidor. La API key nunca llega al navegador.
      </p>
      <ScrollArea className="min-h-0 flex-1">
        {pending.map((label, i) => (
          <div key={`${label}-${i}`} className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping bg-agent opacity-60" />
              <span className="relative inline-flex size-2 bg-agent" />
            </span>
            <span className="truncate font-mono text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
        {traces.length === 0 && pending.length === 0 ? <EmptyInspector /> : null}
        {traces.map((trace) => (
          <TraceRow key={trace.id} trace={trace} />
        ))}
      </ScrollArea>
    </div>
  );
}

function TraceRow({ trace }: { trace: Trace }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ok = trace.status < 300;
  const curl = `curl https://api.croma.run${trace.path} \\\n  -H "Authorization: Bearer $CROMA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(trace.body)}'`;

  return (
    <div className="border-b border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-secondary/40">
        <ChevronRightIcon className={cn("size-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className={cn("font-mono text-[10px] font-medium tabular-nums", ok ? "text-positive" : "text-destructive")}>{trace.status}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{trace.path.replace("/co/dian-facturacion/", "")}</span>
        {trace.demo ? (
          <Badge variant="outline" className="h-4 px-1 font-mono text-[9px] tracking-wider uppercase">
            ejemplo
          </Badge>
        ) : null}
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{formatMs(trace.ms)}</span>
      </button>
      {open ? (
        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow-sm">
              POST · {new Date(trace.at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(curl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              cURL
            </Button>
          </div>
          <Code label="Solicitud" text={JSON.stringify(trace.body, null, 2)} />
          <Code label="Respuesta" text={trace.response} tall />
        </div>
      ) : null}
    </div>
  );
}

function Code({ label, text, tall }: { label: string; text: string; tall?: boolean }) {
  return (
    <div className="border border-line">
      <div className="border-b border-line px-2.5 py-1.5">
        <span className="eyebrow-sm">{label}</span>
      </div>
      <pre className={cn("overflow-auto bg-secondary/30 p-2.5 font-mono text-[10.5px] leading-relaxed", tall ? "max-h-80" : "max-h-40")}>{text}</pre>
    </div>
  );
}

const ENDPOINTS = [
  ["access-requests", "Pide el enlace a la DIAN"],
  ["connections", "Registra la cuenta"],
  ["issued-documents", "Facturas emitidas"],
  ["received-documents", "Facturas recibidas"],
  ["document", "Un documento, con XML y PDF"],
  ["monthly-reports", "Reporte mensual"],
  ["profile", "Perfil de facturación"],
] as const;

function EmptyInspector() {
  return (
    <div className="space-y-4 px-4 py-6">
      <p className="text-xs leading-relaxed text-muted-foreground">Abre el ejemplo o conecta una cuenta: cada llamada aparece aquí con su solicitud, su respuesta y el cURL para copiarla.</p>
      <ol className="border border-line">
        {ENDPOINTS.map(([path, label], i) => (
          <li key={path} className={cn("flex items-center justify-between gap-3 px-3 py-2", i > 0 && "border-t border-line")}>
            <span className="font-mono text-[10.5px]">
              <span className="text-muted-foreground">POST </span>/{path}
            </span>
            <span className="truncate text-[10.5px] text-muted-foreground">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const formatMs =(ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
