"use client";

import { LogOutIcon, PanelRightIcon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { signOut } from "@/app/actions";
import { ConnectFlow } from "@/components/connect-flow";
import { DocumentsPanel } from "@/components/documents-panel";
import { InspectorPanel, useInspector } from "@/components/inspector";
import { OverviewPanel } from "@/components/overview-panel";
import { ProfilePanel, ReportPanel } from "@/components/account-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type Mode = { mode: "demo" } | { mode: "live"; connectionId: string; openedAt: number };

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "emitidas", label: "Emitidas" },
  { id: "recibidas", label: "Recibidas" },
  { id: "reporte", label: "Reporte mensual" },
  { id: "perfil", label: "Perfil" },
] as const;

export function Workspace({ session }: { session: Mode }) {
  const router = useRouter();
  const { traces, expired, reset } = useInspector();
  const [tab, setTab] = useState<string>("resumen");
  const [inspector, setInspector] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [leaving, startLeaving] = useTransition();

  useEffect(() => {
    if (expired) setRenewing(true);
  }, [expired]);

  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 border-x border-line xl:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              {session.mode === "demo" ? (
                <Badge variant="outline" className="font-mono text-[9px] tracking-[0.2em] uppercase">
                  Datos de ejemplo
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 border-positive/40 font-mono text-[9px] tracking-[0.2em] text-positive uppercase">
                  <span className="size-1.5 animate-pulse bg-positive" /> En vivo
                </Badge>
              )}
              {session.mode === "live" ? <SessionClock openedAt={session.openedAt} /> : null}
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{session.mode === "demo" ? "conn_demo · Ejemplo Andino S.A.S" : session.connectionId}</p>
          </div>
          <div className="flex items-center gap-2">
            {session.mode === "live" ? (
              <Button variant="outline" size="sm" onClick={() => setRenewing(true)}>
                <RefreshCwIcon /> Renovar acceso
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="xl:hidden" onClick={() => setInspector(true)}>
              <PanelRightIcon /> Inspector
              <span className="font-mono text-[10px] text-muted-foreground">{traces.length}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={leaving}
              onClick={() =>
                startLeaving(async () => {
                  await signOut();
                  reset();
                  router.refresh();
                })
              }
            >
              <LogOutIcon /> {session.mode === "demo" ? "Salir del ejemplo" : "Desconectar"}
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="gap-0">
          <div className="overflow-x-auto border-b border-line px-4 sm:px-6">
            <TabsList variant="line" className="h-11">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="px-3 text-[13px]">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="resumen">
            <OverviewPanel onOpen={(direction) => setTab(direction === "issued" ? "emitidas" : "recibidas")} />
          </TabsContent>
          <TabsContent value="emitidas">
            <DocumentsPanel direction="issued" />
          </TabsContent>
          <TabsContent value="recibidas">
            <DocumentsPanel direction="received" />
          </TabsContent>
          <TabsContent value="reporte">
            <ReportPanel />
          </TabsContent>
          <TabsContent value="perfil">
            <ProfilePanel />
          </TabsContent>
        </Tabs>
      </div>

      <aside className="hidden border-l border-line xl:block">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <InspectorPanel className="h-full" />
        </div>
      </aside>

      <Sheet open={inspector} onOpenChange={setInspector}>
        <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md">
          <SheetTitle className="sr-only">Inspector</SheetTitle>
          <InspectorPanel className="h-full pt-10" />
        </SheetContent>
      </Sheet>

      <Sheet open={renewing} onOpenChange={setRenewing}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b border-line p-6">
            <SheetTitle className="text-lg tracking-tight">{expired ? "El acceso a la DIAN terminó" : "Renovar acceso"}</SheetTitle>
            <SheetDescription>La DIAN mantiene el acceso abierto cerca de una hora. Con un enlace nuevo la misma conexión se renueva y conserva su id.</SheetDescription>
          </SheetHeader>
          <div className={cn("p-6")}>
            <ConnectFlow onConnected={() => setRenewing(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SessionClock({ openedAt }: { openedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, Math.round((openedAt + 55 * 60_000 - now) / 60_000));
  return <span className="font-mono text-[10px] text-muted-foreground">{left > 0 ? `acceso ~${left} min` : "acceso por renovar"}</span>;
}
