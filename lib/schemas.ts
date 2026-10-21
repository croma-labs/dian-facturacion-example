import { z } from "zod";

// ─── Forms ──────────────────────────────────────────────────────────────────

const digits = (message: string) =>
  z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().min(5, message).max(15, message));

export const documentTypes = ["CC", "CE", "PA", "TI", "NIT"] as const;

export const accessRequestForm = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("empresa"),
    company_nit: digits("Escribe el NIT de la empresa, sin dígito de verificación."),
    document_type: z.enum(documentTypes),
    document_number: digits("Escribe el documento del representante legal."),
  }),
  z.object({
    kind: z.literal("persona"),
    document_type: z.enum(documentTypes),
    document_number: digits("Escribe tu número de documento."),
  }),
]);
export type AccessRequestForm = z.input<typeof accessRequestForm>;

export const connectForm = z.object({
  access_link: z
    .string()
    .trim()
    .url("Pega el enlace completo del correo de la DIAN.")
    .refine((link) => /\.dian\.gov\.co\/User\/AuthToken\?/i.test(link), "Ese no parece un enlace de acceso de la DIAN."),
  authorized: z.literal(true, { error: "Confirma que eres el titular de la cuenta o tienes su autorización." }),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const rangeInput = z
  .object({ from_date: isoDate, to_date: isoDate })
  .refine(({ from_date, to_date }) => from_date <= to_date, "La fecha inicial va antes de la final.")
  .refine(
    ({ from_date, to_date }) => new Date(to_date).getTime() - new Date(from_date).getTime() < 366 * 86_400_000,
    "El rango puede ser de hasta un año.",
  );
export type RangeInput = z.infer<typeof rangeInput>;

export const documentRef = z.object({ cufe: z.string().min(16), issued_on: isoDate });
export const monthInput = z.object({ year: z.number().int().min(2019), month: z.number().int().min(1).max(12) });

// ─── API responses ──────────────────────────────────────────────────────────

const money = z.number().nullable();
export const party = z.object({ nit: z.string().nullable(), name: z.string().nullable() });
export type Party = z.infer<typeof party>;

export const accessRequest = z.object({
  sent: z.boolean(),
  message: z.string().nullable(),
  expires_in_minutes: z.number(),
  requested_at: z.string(),
});
export type AccessRequest = z.infer<typeof accessRequest>;

export const connection = z.object({
  id: z.string(),
  source: z.string(),
  status: z.string(),
  display_name: z.string().nullable(),
  created_at: z.string(),
  last_used_at: z.string().nullable(),
});
export type Connection = z.infer<typeof connection>;

export const listedDocument = z.object({
  cufe: z.string(),
  document_type_code: z.string().nullable(),
  document_type: z.string().nullable(),
  series: z.string().nullable(),
  number: z.string().nullable(),
  issued_on: z.string(),
  received_at: z.string().nullable(),
  issuer: party,
  recipient: party,
  currency: z.string().nullable(),
  payment_form: z.string().nullable(),
  payment_method: z.string().nullable(),
  taxes: z.record(z.string(), money).nullable(),
  withholdings: z.record(z.string(), money).nullable(),
  total: money,
  status: z.string().nullable(),
  radian_status: z.string().nullable(),
});
export type ListedDocument = z.infer<typeof listedDocument>;

export const documentList = z.object({
  from_date: z.string(),
  to_date: z.string(),
  taxpayer: party,
  count: z.number(),
  by_type: z.array(z.object({ document_type: z.string(), count: z.number(), total: z.number() })),
  documents: z.array(listedDocument),
});
export type DocumentList = z.infer<typeof documentList>;

export const fullDocument = z.object({
  found: z.boolean(),
  cufe: z.string(),
  document_type: z.string().nullable(),
  series: z.string().nullable(),
  number: z.string().nullable(),
  issued_on: z.string().nullable(),
  issued_at: z.string().nullable(),
  due_on: z.string().nullable(),
  issuer: party.nullable(),
  recipient: party.nullable(),
  currency: z.string().nullable(),
  payment_form: z.string().nullable(),
  payment_method: z.string().nullable(),
  notes: z.array(z.string()),
  lines: z.array(
    z.object({
      number: z.string().nullable(),
      code: z.string().nullable(),
      description: z.string().nullable(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      unit_price: money,
      line_total: money,
    }),
  ),
  totals: z.record(z.string(), money).nullable(),
  taxes: z.array(z.object({ name: z.string(), value: money })),
  total: money,
  legitimate_holder: z.string().nullable(),
  validations: z.array(z.object({ name: z.string().nullable(), result: z.string().nullable(), detail: z.string().nullable() })),
  events: z.array(z.object({ code: z.string().nullable(), name: z.string().nullable(), date: z.string().nullable() })),
  xml: z.string().nullable(),
  pdf_base64: z.string().nullable(),
});
export type FullDocument = z.infer<typeof fullDocument>;

const flow = z.object({
  month_count: z.number().nullable(),
  month_amount: money,
  year_count: z.number().nullable(),
  year_amount: money,
});

export const monthlyReport = z.object({
  year: z.number(),
  month: z.number(),
  available: z.boolean(),
  reference: z.string().nullable(),
  dated_on: z.string().nullable(),
  cutoff_date: z.string().nullable(),
  documents: z.array(z.object({ document_type: z.string(), issued: flow, received: flow })),
});
export type MonthlyReport = z.infer<typeof monthlyReport>;

export const profile = z.object({
  nit: z.string().nullable(),
  name: z.string().nullable(),
  business_name: z.string().nullable(),
  email: z.string().nullable(),
  status: z.string().nullable(),
  reception_email: z.string().nullable(),
  legal_representatives: z.array(z.object({ document_number: z.string().nullable(), name: z.string().nullable(), email: z.string().nullable() })),
  operation_modes: z.array(z.object({ mode: z.string().nullable(), registered_on: z.string().nullable(), software: z.string().nullable() })),
  numbering_ranges: z.array(
    z.object({
      provider: z.string().nullable(),
      document_type: z.string().nullable(),
      prefix: z.string().nullable(),
      resolution: z.string().nullable(),
      from_number: z.union([z.number(), z.string()]).nullable(),
      to_number: z.union([z.number(), z.string()]).nullable(),
      associated_on: z.string().nullable(),
      expires_on: z.string().nullable(),
    }),
  ),
});
export type Profile = z.infer<typeof profile>;

export const apiError = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
