const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export const pesos = (value: number | null | undefined) => (value === null || value === undefined ? "–" : money.format(value));
export const pesosCompact = (value: number) => `$${compact.format(value)}`;

export function day(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!value) return "–";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("es-CO", { ...options, timeZone: "UTC" });
}

export const monthName = (month: number, style: "short" | "long" = "short") =>
  new Date(Date.UTC(2026, month - 1, 1)).toLocaleDateString("es-CO", { month: style, timeZone: "UTC" }).replace(".", "");

export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

export function shiftDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const documentLabel = (doc: { series: string | null; number: string | null; cufe: string }) =>
  [doc.series, doc.number].filter(Boolean).join("") || doc.cufe.slice(0, 10);
