"use client";

import { ArrowRightIcon, FileTextIcon, KeyRoundIcon, SparklesIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startDemo } from "@/app/actions";
import { ConnectFlow } from "@/components/connect-flow";
import { InspectorPanel } from "@/components/inspector";
import { cn } from "@/lib/utils";

const HOW = [
  {
    n: "01",
    title: "Pide el enlace",
    body: "La DIAN lo envía al correo del RUT del representante legal. Sin contraseñas que guardar.",
    code: "POST /access-requests/v1",
  },
  {
    n: "02",
    title: "Regístralo",
    body: "Croma abre el acceso, verifica la cuenta y te devuelve un id de conexión para guardar con tu usuario.",
    code: "POST /connections/v1",
  },
  {
    n: "03",
    title: "Consulta",
    body: "Facturas emitidas y recibidas, cada documento con su XML y PDF, el reporte mensual y el perfil.",
    code: "POST /issued-documents/v1",
  },
];

export function Landing() {
  const router = useRouter();
  const [path, setPath] = useState<"choose" | "connect">("choose");
  const [opening, startOpening] = useTransition();

  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 border-x border-line xl:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden className="ruled-grid absolute inset-0" />
          <div className="relative px-6 pt-16 pb-14 sm:px-10 lg:pt-24">
            <p className="eyebrow flex items-center gap-2">
              <span className="size-1.5 bg-agent" /> DIAN · Facturación electrónica
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl">
              Las facturas de tus clientes, <span className="text-muted-foreground">en una API.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
              Emitidas y recibidas, con impuestos, retenciones, el XML y el PDF de cada documento. Leídas en vivo de la DIAN como la cuenta de tu usuario.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground">
              <span>
                <span className="text-foreground">6</span> endpoints
              </span>
              <span>
                <span className="text-foreground">13</span> impuestos por documento
              </span>
              <span>
                <span className="text-foreground">XML + PDF</span> originales
              </span>
              <span>
                <span className="text-foreground">0</span> contraseñas guardadas
              </span>
            </div>
          </div>
        </section>

        <section className="border-b border-line">
          {path === "choose" ? (
            <div className="grid md:grid-cols-2">
              <PathCard
                index="01"
                icon={<SparklesIcon className="size-4" />}
                title="Explorar con datos de ejemplo"
                body="Una empresa ficticia con dos años de facturación. Sin cuenta, al instante. Las llamadas se ven igual que en vivo."
                cta={opening ? "Abriendo…" : "Abrir el ejemplo"}
                accent
                onClick={() =>
                  startOpening(async () => {
                    await startDemo();
                    router.refresh();
                  })
                }
              />
              <PathCard
                index="02"
                icon={<KeyRoundIcon className="size-4" />}
                title="Conectar mi cuenta DIAN"
                body="Pide el enlace de acceso a tu correo y regístralo. Tus datos se leen en vivo y no se guardan en ningún lado."
                cta="Conectar"
                className="border-t border-line md:border-t-0 md:border-l"
                onClick={() => setPath("connect")}
              />
            </div>
          ) : (
            <div className="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-4">
                <button type="button" onClick={() => setPath("choose")} className="eyebrow-sm hover:text-foreground">
                  ← Volver
                </button>
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">Conecta tu facturación electrónica</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  La DIAN no usa contraseña para este sistema: envía un enlace de acceso al correo del RUT, válido por 60 minutos. El acceso que abre dura cerca de una hora; después se
                  renueva con un enlace nuevo, sin perder la conexión.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">Mira el inspector: cada paso es una llamada a la API que puedes copiar.</p>
              </div>
              <ConnectFlow />
            </div>
          )}
        </section>

        <section className="grid border-b border-line md:grid-cols-3">
          {HOW.map((step, i) => (
            <div key={step.n} className={cn("space-y-3 px-6 py-8 sm:px-8", i > 0 && "border-t border-line md:border-t-0 md:border-l")}>
              <span className="font-mono text-[10px] text-agent">[{step.n}]</span>
              <h3 className="font-medium tracking-tight">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              <code className="inline-block border border-line px-2 py-1 font-mono text-[10.5px] text-muted-foreground">{step.code}</code>
            </div>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <div className="flex items-center gap-3">
            <Image alt="" className="size-4 dark:invert" height={16} src="/croma_symbol_black.svg" width={16} />
            <span className="eyebrow-sm">Código abierto · MIT</span>
          </div>
          <a href="https://docs.croma.run/guides/colombia/dian-facturacion" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <FileTextIcon className="size-3.5" /> Guía de la API
          </a>
        </footer>
      </div>

      <aside className="hidden border-l border-line xl:block">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <InspectorPanel className="h-full" />
        </div>
      </aside>
    </div>
  );
}

function PathCard({
  index,
  icon,
  title,
  body,
  cta,
  accent,
  className,
  onClick,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  accent?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group relative flex flex-col items-start gap-4 px-6 py-8 text-left transition-colors hover:bg-secondary/40 sm:px-10 sm:py-10", className)}
    >
      <div className="flex w-full items-center justify-between">
        <span className={cn("flex size-8 items-center justify-center border", accent ? "border-agent/40 text-agent" : "border-line text-muted-foreground")}>{icon}</span>
        <span className="font-mono text-[10px] text-muted-foreground">[{index}]</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <span className={cn("mt-auto flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] uppercase", accent ? "text-agent" : "text-foreground")}>
        {cta}
        <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
