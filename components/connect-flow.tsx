"use client";

import { ArrowRightIcon, CheckIcon, Loader2Icon, MailIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { connect, requestAccess } from "@/app/actions";
import { useInspector } from "@/components/inspector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { accessRequestForm, connectForm, documentTypes, type AccessRequest } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const STEPS = ["Pedir enlace", "Pegar enlace", "Listo"] as const;
const DOCUMENT_LABELS: Record<(typeof documentTypes)[number], string> = { CC: "CC", CE: "CE", PA: "Pasaporte", TI: "TI", NIT: "NIT" };

export function ConnectFlow({ onConnected }: { onConnected?: () => void }) {
  const router = useRouter();
  const { run, reset } = useInspector();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [kind, setKind] = useState<"empresa" | "persona">("empresa");
  const [documentType, setDocumentType] = useState<(typeof documentTypes)[number]>("CC");
  const [companyNit, setCompanyNit] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [link, setLink] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [sent, setSent] = useState<AccessRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function ask() {
    const input = { kind, company_nit: companyNit, document_type: documentType, document_number: documentNumber };
    const valid = accessRequestForm.safeParse(input);
    if (!valid.success) return setError(valid.error.issues[0]!.message);
    setError(null);
    startTransition(async () => {
      const result = await run(`access-${Date.now()}`, "access-requests", () => requestAccess(input));
      if (!result.ok) return setError(result.error.message);
      if (!result.data.sent) return setError(result.data.message ?? "La DIAN no envió el enlace. Revisa los datos.");
      setSent(result.data);
      setStep(1);
    });
  }

  function register() {
    const input = { access_link: link, authorized };
    const valid = connectForm.safeParse(input);
    if (!valid.success) return setError(valid.error.issues[0]!.message);
    setError(null);
    startTransition(async () => {
      const result = await run(`connect-${Date.now()}`, "connections", () => connect(input));
      if (!result.ok) {
        return setError(result.error.code === "connection_rejected" ? "La DIAN ya no acepta ese enlace. Solicita uno nuevo: dura 60 minutos." : result.error.message);
      }
      setStep(2);
      reset();
      setTimeout(() => {
        onConnected?.();
        router.refresh();
      }, 900);
    });
  }

  return (
    <div className="border border-line bg-background">
      <ol className="grid grid-cols-3 border-b border-line">
        {STEPS.map((label, i) => (
          <li key={label} className={cn("relative flex items-center gap-2 px-4 py-3", i > 0 && "border-l border-line")}>
            <span className={cn("font-mono text-[10px] tabular-nums", i <= step ? "text-agent" : "text-muted-foreground")}>
              {i < step ? <CheckIcon className="size-3" /> : `[0${i + 1}]`}
            </span>
            <span className={cn("truncate text-xs", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i === step ? <span className="absolute inset-x-0 -bottom-px h-px bg-agent" /> : null}
          </li>
        ))}
      </ol>

      <div className="p-5 sm:p-6">
        {step === 0 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold tracking-tight">¿De quién son las facturas?</h3>
              <p className="text-sm text-muted-foreground">La DIAN enviará un enlace de acceso al correo registrado en el RUT. No hay contraseña.</p>
            </div>
            <ToggleGroup
              value={[kind]}
              onValueChange={(value) => value[0] && setKind(value[0] as typeof kind)}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              <ToggleGroupItem value="empresa" className="flex-1">
                Empresa
              </ToggleGroupItem>
              <ToggleGroupItem value="persona" className="flex-1">
                Persona natural
              </ToggleGroupItem>
            </ToggleGroup>

            {kind === "empresa" ? (
              <Field label="NIT de la empresa" hint="Sin dígito de verificación">
                <Input inputMode="numeric" placeholder="900123456" value={companyNit} onChange={(e) => setCompanyNit(e.target.value)} className="h-10 font-mono" />
              </Field>
            ) : null}

            <div className="grid grid-cols-[7.5rem_1fr] gap-3">
              <Field label="Tipo">
                <Select value={documentType} onValueChange={(value) => setDocumentType(value as typeof documentType)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {DOCUMENT_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={kind === "empresa" ? "Documento del representante legal" : "Número de documento"}>
                <Input inputMode="numeric" placeholder="1234567890" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="h-10 font-mono" />
              </Field>
            </div>

            <ErrorLine message={error} />

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="h-10 px-4" onClick={ask} disabled={busy}>
                {busy ? <Loader2Icon className="animate-spin" /> : <MailIcon />}
                {busy ? "Solicitando a la DIAN" : "Enviar enlace a mi correo"}
              </Button>
              <Button variant="link" className="text-muted-foreground" onClick={() => (setError(null), setStep(1))}>
                Ya tengo un enlace
              </Button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold tracking-tight">Revisa tu correo</h3>
              <p className="text-sm text-muted-foreground">
                {sent
                  ? kind === "empresa"
                    ? "La DIAN envió el enlace al correo del RUT del representante legal."
                    : "La DIAN envió el enlace al correo registrado en tu RUT."
                  : "Pega el enlace que te llegó de la DIAN."}{" "}
                Cópialo completo, desde el botón o el texto del correo.
              </p>
            </div>

            {sent ? <Countdown requestedAt={sent.requested_at} minutes={sent.expires_in_minutes} /> : null}

            <Field label="Enlace de acceso">
              <textarea
                rows={3}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://catalogo-vpfe.dian.gov.co/User/AuthToken?pk=…&rk=…&token=…"
                className="w-full resize-none border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
              <Checkbox checked={authorized} onCheckedChange={(value) => setAuthorized(value === true)} className="mt-0.5" />
              Soy el titular de la cuenta o tengo su autorización para consultarla.
            </label>

            <ErrorLine message={error} />

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="h-10 px-4" onClick={register} disabled={busy}>
                {busy ? <Loader2Icon className="animate-spin" /> : <ArrowRightIcon />}
                {busy ? "Verificando con la DIAN" : "Conectar cuenta"}
              </Button>
              <Button variant="link" className="text-muted-foreground" onClick={() => (setError(null), setStep(0))}>
                Solicitar otro enlace
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-10 items-center justify-center border border-positive/40 text-positive">
              <CheckIcon className="size-5" />
            </span>
            <p className="font-medium">Cuenta conectada</p>
            <p className="text-sm text-muted-foreground">Abriendo tus facturas…</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        {hint ? <span className="eyebrow-sm">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive">{message}</p>;
}

function Countdown({ requestedAt, minutes }: { requestedAt: string; minutes: number }) {
  const deadline = new Date(requestedAt).getTime() + minutes * 60_000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, deadline - now);
  const progress = left / (minutes * 60_000);
  return (
    <div className="border border-line">
      <div className="flex items-center justify-between px-3 py-2.5 text-sm">
        <span className="flex items-center gap-2">
          <span className="size-1.5 bg-positive" />
          Enlace enviado
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {left > 0 ? `vence en ${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}` : "venció"}
        </span>
      </div>
      <div className="h-px bg-line">
        <div className="h-px bg-agent transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
