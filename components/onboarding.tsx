"use client";

import { useActionState, useEffect, useState } from "react";

import { connect, requestAccess, type ConnectState, type RequestAccessState } from "@/app/actions";
import { ApiCall } from "@/components/api-call";

const STEPS = ["Solicita el acceso", "Pega el enlace", "Consulta tus facturas"] as const;

export function Onboarding({ renewing = false }: { renewing?: boolean }) {
  const [step, setStep] = useState<0 | 1>(0);
  const [kind, setKind] = useState<"empresa" | "persona">("empresa");
  const [request, requestAction, requesting] = useActionState<RequestAccessState, FormData>(requestAccess, { status: "idle" });
  const [connection, connectAction, connecting] = useActionState<ConnectState, FormData>(connect, { status: "idle" });

  useEffect(() => {
    if (request.status === "sent") setStep(1);
  }, [request.status]);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr]">
      <section className="min-w-0">
        <Stepper current={step} />

        {renewing ? (
          <p className="mt-6 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
            El acceso de la DIAN dura cerca de una hora y ya terminó. Solicita un enlace nuevo: la conexión se renueva y conserva su id.
          </p>
        ) : null}

        {step === 0 ? (
          <form action={requestAction} className="mt-8 space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Conecta tu facturación electrónica</h1>
              <p className="mt-2 text-sm text-muted">
                La DIAN no usa contraseña para este sistema: envía un enlace de acceso al correo registrado en el RUT. Lo pedimos por ti.
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-line bg-white p-1 text-sm">
              {(["empresa", "persona"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  className={`rounded-md px-3 py-1.5 ${kind === option ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                >
                  {option === "empresa" ? "Empresa" : "Persona natural"}
                </button>
              ))}
            </div>
            <input type="hidden" name="kind" value={kind} />

            {kind === "empresa" ? (
              <Field label="NIT de la empresa" hint="Sin dígito de verificación, puntos ni guiones.">
                <input name="company_nit" inputMode="numeric" placeholder="900123456" className={input} required />
              </Field>
            ) : null}

            <div className="grid grid-cols-[8rem_1fr] gap-3">
              <Field label="Tipo">
                <select name="document_type" defaultValue="CC" className={input}>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="PA">Pasaporte</option>
                  <option value="TI">TI</option>
                  <option value="NIT">NIT</option>
                </select>
              </Field>
              <Field label={kind === "empresa" ? "Documento del representante legal" : "Número de documento"}>
                <input name="document_number" inputMode="numeric" placeholder="1234567890" className={input} required />
              </Field>
            </div>

            {request.status === "error" ? <Alert>{request.message}</Alert> : null}

            <div className="flex items-center gap-4">
              <button type="submit" disabled={requesting} className={button}>
                {requesting ? "Solicitando a la DIAN..." : "Enviar enlace a mi correo"}
              </button>
              <button type="button" onClick={() => setStep(1)} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                Ya tengo un enlace
              </button>
            </div>
          </form>
        ) : (
          <form action={connectAction} className="mt-8 space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-muted">
                {kind === "empresa"
                  ? "La DIAN envió el enlace al correo del RUT del representante legal."
                  : "La DIAN envió el enlace al correo registrado en tu RUT."}{" "}
                Copia el enlace completo del botón o del texto del correo y pégalo aquí.
              </p>
            </div>

            {request.status === "sent" ? <Countdown requestedAt={request.result.requested_at} minutes={request.result.expires_in_minutes} /> : null}

            <Field label="Enlace de acceso">
              <textarea
                name="access_link"
                rows={3}
                placeholder="https://catalogo-vpfe.dian.gov.co/User/AuthToken?pk=...&rk=...&token=..."
                className={`${input} font-mono text-xs`}
                required
              />
            </Field>

            <label className="flex items-start gap-3 text-sm text-muted">
              <input type="checkbox" name="authorized" className="mt-0.5 size-4 accent-ink" required />
              Soy el titular de la cuenta o tengo su autorización para consultarla.
            </label>

            {connection.status === "error" ? <Alert>{connection.message}</Alert> : null}

            <div className="flex items-center gap-4">
              <button type="submit" disabled={connecting} className={button}>
                {connecting ? "Conectando con la DIAN..." : "Conectar cuenta"}
              </button>
              <button type="button" onClick={() => setStep(0)} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                Solicitar otro enlace
              </button>
            </div>
          </form>
        )}
      </section>

      <aside className="min-w-0 space-y-4 lg:pt-14">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Lo que pasa por debajo</p>
        {step === 0 ? (
          <ApiCall
            path="/co/dian-facturacion/access-requests/v1"
            body={kind === "empresa" ? { document_type: "CC", document_number: "1234567890", company_nit: "900123456" } : { document_type: "CC", document_number: "1234567890" }}
            note="Corre sin conexión: es el paso que la crea. La DIAN envía el enlace al correo del RUT y responde sent: true."
          />
        ) : (
          <ApiCall
            path="/co/dian-facturacion/connections/v1"
            body={{ access_link: "<enlace del correo de la DIAN>", authorized: true }}
            note="Croma abre el enlace, verifica la cuenta y responde con un id de conexión (conn_...). Guárdalo junto a tu usuario. Registrar la misma cuenta otra vez la renueva y conserva el id."
          />
        )}
        <ApiCall
          path="/co/dian-facturacion/issued-documents/v1"
          body={{ connection_id: "conn_...", from_date: "2026-01-01", to_date: "2026-12-31" }}
          note="Con la conexión, cada consulta lee la DIAN en vivo como esa cuenta: facturas emitidas y recibidas, una factura completa con su XML y PDF, el reporte mensual y el perfil."
        />
      </aside>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      {STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`flex size-6 items-center justify-center rounded-full border font-medium ${
              index < current ? "border-ok bg-ok text-white" : index === current ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"
            }`}
          >
            {index < current ? "✓" : index + 1}
          </span>
          <span className={index === current ? "font-medium" : "text-muted"}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function Countdown({ requestedAt, minutes }: { requestedAt: string; minutes: number }) {
  const deadline = new Date(requestedAt).getTime() + minutes * 60_000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, deadline - now);
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000).toString().padStart(2, "0");
  return (
    <div className="flex items-center justify-between rounded-lg border border-ok/30 bg-ok/5 px-4 py-3 text-sm">
      <span className="text-ok">La DIAN envió el enlace.</span>
      <span className="font-mono text-ok">
        {left > 0 ? `vence en ${mm}:${ss}` : "venció, solicita otro"}
      </span>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</p>;
}

const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink";
const button = "rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60";
