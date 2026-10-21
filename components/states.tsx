"use client";

import { AlertTriangleIcon, ClockIcon } from "lucide-react";

export function ErrorState({ code, message }: { code: string; message: string }) {
  const expired = code === "connection_rejected" || code === "connection_required" || code === "connection_not_found";
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <span className="flex size-10 items-center justify-center border border-line text-muted-foreground">
        {expired ? <ClockIcon className="size-4" /> : <AlertTriangleIcon className="size-4" />}
      </span>
      <p className="font-medium">{expired ? "El acceso a la DIAN terminó" : "No pudimos completar la consulta"}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {expired ? "La DIAN mantiene el acceso abierto cerca de una hora. Renuévalo con un enlace nuevo; la conexión conserva su id." : message}
      </p>
      <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
