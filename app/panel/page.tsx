import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { disconnect } from "@/app/actions";
import { DocumentsView, Loading, MonthlyReportView, ProfileView } from "@/components/views";
import { startOfYear, today } from "@/lib/format";
import { getConnectionId } from "@/lib/session";

export const maxDuration = 300;

const TABS = [
  { id: "emitidas", label: "Emitidas" },
  { id: "recibidas", label: "Recibidas" },
  { id: "reporte", label: "Reporte mensual" },
  { id: "perfil", label: "Perfil" },
] as const;

type Tab = (typeof TABS)[number]["id"];

interface Params {
  vista?: string;
  desde?: string;
  hasta?: string;
  mes?: string;
}

export default async function Panel({ searchParams }: { searchParams: Promise<Params> }) {
  const connectionId = await getConnectionId();
  if (!connectionId) redirect("/");

  const params = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === params.vista) ? (params.vista as Tab) : "emitidas";
  const from = params.desde ?? startOfYear();
  const to = params.hasta ?? today();
  const month = params.mes ?? previousMonth();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tu facturación electrónica</h1>
          <p className="mt-1 text-sm text-muted">
            Conexión <span className="font-mono text-xs">{connectionId}</span>
          </p>
        </div>
        <form action={disconnect}>
          <button className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">Desconectar</button>
        </form>
      </div>

      <nav className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/panel?vista=${t.id}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${t.id === tab ? "border-ink font-medium" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "emitidas" || tab === "recibidas" ? (
        <>
          <form className="flex flex-wrap items-end gap-3 text-sm">
            <input type="hidden" name="vista" value={tab} />
            <label>
              <span className="mb-1 block text-xs text-muted">Desde</span>
              <input type="date" name="desde" defaultValue={from} className="rounded-lg border border-line bg-white px-3 py-1.5" />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted">Hasta</span>
              <input type="date" name="hasta" defaultValue={to} className="rounded-lg border border-line bg-white px-3 py-1.5" />
            </label>
            <button className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium hover:border-ink">Consultar</button>
            <span className="text-xs text-muted">Hasta un año por consulta.</span>
          </form>
          <Suspense key={`${tab}-${from}-${to}`} fallback={<Loading label={`Consultando facturas ${tab}...`} />}>
            <DocumentsView connectionId={connectionId} direction={tab === "emitidas" ? "issued" : "received"} from={from} to={to} />
          </Suspense>
        </>
      ) : null}

      {tab === "reporte" ? (
        <>
          <form className="flex items-end gap-3 text-sm">
            <input type="hidden" name="vista" value="reporte" />
            <label>
              <span className="mb-1 block text-xs text-muted">Mes</span>
              <input type="month" name="mes" defaultValue={month} className="rounded-lg border border-line bg-white px-3 py-1.5" />
            </label>
            <button className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium hover:border-ink">Consultar</button>
          </form>
          <Suspense key={month} fallback={<Loading label="Consultando el reporte mensual..." />}>
            <MonthlyReportView connectionId={connectionId} year={Number(month.slice(0, 4))} month={Number(month.slice(5, 7))} />
          </Suspense>
        </>
      ) : null}

      {tab === "perfil" ? (
        <Suspense fallback={<Loading label="Consultando el perfil..." />}>
          <ProfileView connectionId={connectionId} />
        </Suspense>
      ) : null}
    </div>
  );
}

function previousMonth(): string {
  const [year, month] = today().split("-").map(Number);
  const d = new Date(Date.UTC(year!, month! - 2, 1));
  return d.toISOString().slice(0, 7);
}
