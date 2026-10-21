import "server-only";

import { preview } from "@/lib/croma";
import type { DocumentList, FullDocument, ListedDocument, MonthlyReport, Party, Profile } from "@/lib/schemas";
import type { Result } from "@/lib/trace";

/**
 * Sample data for the playground: a fictional company and its invoices,
 * generated the same way every time. Shapes match the API exactly, so the UI
 * cannot tell the difference.
 */

const COMPANY: Party = { nit: "900123456", name: "EJEMPLO ANDINO S.A.S" };

const CLIENTS: Party[] = [
  { nit: "900456789", name: "CAFÉ DE LA SIERRA S.A.S" },
  { nit: "901234567", name: "LOGÍSTICA DEL PACÍFICO S.A.S" },
  { nit: "860512345", name: "CONSTRUCTORA ALTOS DEL RÍO S.A" },
  { nit: "900987654", name: "CLÍNICA SAN RAFAEL LTDA" },
  { nit: "901765432", name: "AGRO CARIBE S.A.S" },
  { nit: "830234567", name: "TEXTILES MEDELLÍN S.A" },
];

const PROVIDERS: { party: Party; concept: string; base: number }[] = [
  { party: { nit: "901444555", name: "DESARROLLADORES ALIADOS S.A.S" }, concept: "Desarrollo subcontratado", base: 38_000_000 },
  { party: { nit: "900111222", name: "NUBE ANDINA SOFTWARE S.A.S" }, concept: "Infraestructura en la nube", base: 9_400_000 },
  { party: { nit: "830333444", name: "INMOBILIARIA CENTRO S.A.S" }, concept: "Arrendamiento oficina", base: 7_800_000 },
  { party: { nit: "900777888", name: "CONTADORES ASOCIADOS S.A.S" }, concept: "Servicios contables", base: 2_600_000 },
  { party: { nit: "800555666", name: "TELECOMUNICACIONES DEL VALLE S.A" }, concept: "Internet y telefonía", base: 640_000 },
  { party: { nit: "901999000", name: "PAPELERÍA EL ESTUDIANTE S.A.S" }, concept: "Útiles de oficina", base: 310_000 },
];

const SERVICES = [
  "Consultoría en transformación digital",
  "Desarrollo de software a la medida",
  "Soporte y mantenimiento mensual",
  "Capacitación a equipos",
  "Implementación de integraciones",
];

/** A small deterministic generator, so every visit sees the same company. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function cufe(seed: string): string {
  let h = 2166136261;
  let out = "";
  for (let round = 0; out.length < 96; round++) {
    for (const ch of `${seed}:${round}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, 96);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const round = (n: number) => Math.round(n / 1000) * 1000;

const ZERO_TAXES = { iva: 0, ica: 0, ic: 0, inc: 0, timbre: 0, inc_bolsas: 0, in_carbono: 0, in_combustibles: 0, ic_datos: 0, icl: 0, inpp: 0, ibua: 0, icui: 0 };

interface Seeded extends ListedDocument {
  lines: FullDocument["lines"];
}

function build(): { issued: Seeded[]; received: Seeded[] } {
  const rand = random(20261020);
  const issued: Seeded[] = [];
  const received: Seeded[] = [];
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
  let fe = 1040;
  let events = 51200;

  for (let month = new Date(start); month <= today; month.setUTCMonth(month.getUTCMonth() + 1)) {
    const y = month.getUTCFullYear();
    const m = month.getUTCMonth();
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const growth = 1 + (y - start.getUTCFullYear()) * 0.35 + m * 0.02;

    const sales = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < sales; i++) {
      const day = new Date(Date.UTC(y, m, 1 + Math.floor(rand() * days)));
      if (day > today) continue;
      const client = CLIENTS[Math.floor(rand() * CLIENTS.length)]!;
      const lineCount = 1 + Math.floor(rand() * 3);
      const lines = Array.from({ length: lineCount }, (_, n) => {
        const quantity = 1 + Math.floor(rand() * 4);
        const unit = round((900_000 + rand() * 5_500_000) * growth);
        return {
          number: String(n + 1),
          code: `SRV-${100 + Math.floor(rand() * 900)}`,
          description: SERVICES[Math.floor(rand() * SERVICES.length)]!,
          quantity,
          unit: "UN",
          unit_price: unit,
          line_total: unit * quantity,
        };
      });
      const base = lines.reduce((sum, line) => sum + line.line_total, 0);
      const iva = Math.round(base * 0.19);
      const credit = rand() < 0.06;
      const number = String(fe++);
      issued.push({
        cufe: cufe(`issued-${number}`),
        document_type_code: credit ? "91" : "01",
        document_type: credit ? "Nota de crédito electrónica" : "Factura electrónica",
        series: credit ? "NC" : "FE",
        number,
        issued_on: iso(day),
        received_at: `${iso(day)}T${String(8 + Math.floor(rand() * 10)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00-05:00`,
        issuer: COMPANY,
        recipient: client,
        currency: "COP",
        payment_form: rand() < 0.7 ? "2" : "1",
        payment_method: "42",
        taxes: { ...ZERO_TAXES, iva },
        withholdings: { rete_iva: 0, rete_renta: Math.round(base * 0.04), rete_ica: Math.round(base * 0.00966) },
        total: base + iva,
        status: "Aprobado",
        radian_status: "Factura Electrónica",
        lines,
      });
    }

    for (const provider of PROVIDERS) {
      if (rand() < 0.15) continue;
      const day = new Date(Date.UTC(y, m, 1 + Math.floor(rand() * Math.min(days, 12))));
      if (day > today) continue;
      const base = round(provider.base * (0.9 + rand() * 0.25));
      const iva = Math.round(base * 0.19);
      const number = `${provider.party.name!.slice(0, 2)}${7000 + Math.floor(rand() * 2000)}`;
      received.push({
        cufe: cufe(`received-${provider.party.nit}-${iso(day)}`),
        document_type_code: "01",
        document_type: "Factura electrónica",
        series: null,
        number,
        issued_on: iso(day),
        received_at: `${iso(day)}T10:15:00-05:00`,
        issuer: provider.party,
        recipient: COMPANY,
        currency: "COP",
        payment_form: "2",
        payment_method: "42",
        taxes: { ...ZERO_TAXES, iva },
        withholdings: { rete_iva: 0, rete_renta: 0, rete_ica: 0 },
        total: base + iva,
        status: "Aprobado",
        radian_status: "Factura Electrónica",
        lines: [{ number: "1", code: "001", description: provider.concept, quantity: 1, unit: "UN", unit_price: base, line_total: base }],
      });
      if (rand() < 0.5) {
        received.push({
          cufe: cufe(`event-${events}`),
          document_type_code: "96",
          document_type: "Application response",
          series: null,
          number: String(events++),
          issued_on: iso(day),
          received_at: null,
          issuer: provider.party,
          recipient: COMPANY,
          currency: null,
          payment_form: null,
          payment_method: null,
          taxes: { ...ZERO_TAXES },
          withholdings: { rete_iva: 0, rete_renta: 0, rete_ica: 0 },
          total: 0,
          status: "Aprobado",
          radian_status: null,
          lines: [],
        });
      }
    }
  }
  // Number the company's own documents in issue order, one sequence per prefix, as a real invoicing range runs.
  const sequence: Record<string, number> = { FE: 1001, NC: 101 };
  for (const doc of [...issued].sort((a, b) => (a.received_at ?? "").localeCompare(b.received_at ?? "") || a.issued_on.localeCompare(b.issued_on))) {
    doc.number = String(sequence[doc.series!]!++);
    doc.cufe = cufe(`issued-${doc.series}${doc.number}`);
  }
  const byDate = (a: Seeded, b: Seeded) => b.issued_on.localeCompare(a.issued_on) || Number(b.number) - Number(a.number);
  return { issued: issued.sort(byDate), received: received.sort(byDate) };
}

const DATA = build();

function strip({ lines: _lines, ...doc }: Seeded): ListedDocument {
  return doc;
}

export function demoList(direction: "issued" | "received", from: string, to: string): DocumentList {
  const documents = DATA[direction].filter((d) => d.issued_on >= from && d.issued_on <= to).map(strip);
  const types = new Map<string, { count: number; total: number }>();
  for (const d of documents) {
    const row = types.get(d.document_type!) ?? { count: 0, total: 0 };
    row.count++;
    row.total += d.total ?? 0;
    types.set(d.document_type!, row);
  }
  return {
    from_date: from,
    to_date: to,
    taxpayer: COMPANY,
    count: documents.length,
    by_type: [...types].map(([document_type, row]) => ({ document_type, ...row })),
    documents,
  };
}

export function demoDocument(cufeValue: string, issuedOn: string): FullDocument {
  const doc = [...DATA.issued, ...DATA.received].find((d) => d.cufe === cufeValue && d.issued_on === issuedOn);
  if (!doc) {
    return {
      found: false, cufe: cufeValue, document_type: null, series: null, number: null, issued_on: null, issued_at: null, due_on: null,
      issuer: null, recipient: null, currency: null, payment_form: null, payment_method: null, notes: [], lines: [], totals: null,
      taxes: [], total: null, legitimate_holder: null, validations: [], events: [], xml: null, pdf_base64: null,
    };
  }
  const base = doc.lines.reduce((sum, line) => sum + (line.line_total ?? 0), 0);
  const due = new Date(`${doc.issued_on}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + 30);
  const hasFiles = doc.document_type_code !== "96";
  return {
    found: true,
    cufe: doc.cufe,
    document_type: doc.document_type,
    series: doc.series,
    number: doc.number,
    issued_on: doc.issued_on,
    issued_at: doc.received_at,
    due_on: doc.payment_form === "2" ? iso(due) : null,
    issuer: doc.issuer,
    recipient: doc.recipient,
    currency: doc.currency,
    payment_form: doc.payment_form,
    payment_method: doc.payment_method,
    notes: [],
    lines: doc.lines,
    totals: hasFiles ? { lines: base, tax_exclusive: base, tax_inclusive: doc.total, payable: doc.total } : null,
    taxes: hasFiles ? [{ name: "IVA", value: doc.taxes?.iva ?? 0 }] : [],
    total: doc.total,
    legitimate_holder: doc.issuer.name,
    validations: [{ name: "Documento validado por la DIAN", result: "Aprobado", detail: null }],
    events: doc.document_type_code === "01" ? [{ code: "030", name: "Acuse de recibo de la factura", date: doc.issued_on }] : [],
    xml: hasFiles ? ublXml(doc) : null,
    pdf_base64: hasFiles ? Buffer.from(invoicePdf(doc)).toString("base64") : null,
  };
}

export function demoProfile(): Profile {
  const year = new Date().getUTCFullYear();
  return {
    nit: COMPANY.nit,
    name: COMPANY.name,
    business_name: COMPANY.name,
    email: "facturacion@ejemploandino.co",
    status: "Habilitado",
    reception_email: "recepcion@ejemploandino.co",
    legal_representatives: [{ document_number: "1234567890", name: "MARÍA FERNANDA GÓMEZ", email: "gerencia@ejemploandino.co" }],
    operation_modes: [{ mode: "Software de un proveedor tecnológico", registered_on: `${year - 2}-03-14`, software: "Facturador Ejemplo" }],
    numbering_ranges: [
      { provider: "PROVEEDOR EJEMPLO S.A.S", document_type: "01 - Factura Electrónica", prefix: "FE", resolution: "18764000000001", from_number: 1000, to_number: 5000, associated_on: `${year}-01-10`, expires_on: `${year + 1}-01-10` },
    ],
  };
}

export function demoMonthlyReport(year: number, month: number): MonthlyReport {
  const now = new Date();
  const available = year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1);
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const sum = (docs: Seeded[], type: string, test: (d: Seeded) => boolean) => {
    const rows = docs.filter((d) => d.document_type === type && test(d));
    return { count: rows.length, amount: rows.reduce((s, d) => s + (d.total ?? 0), 0) };
  };
  const types = ["Factura electrónica", "Nota de crédito electrónica"];
  return {
    year,
    month,
    available,
    reference: available ? `${COMPANY.nit}-EF${String(month).padStart(2, "0")}-${year}` : null,
    dated_on: available ? `${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, "0")}-15` : null,
    cutoff_date: available ? `${prefix}-28` : null,
    documents: available
      ? types.map((type) => {
          const im = sum(DATA.issued, type, (d) => d.issued_on.startsWith(prefix));
          const iy = sum(DATA.issued, type, (d) => d.issued_on.startsWith(String(year)) && d.issued_on <= `${prefix}-31`);
          const rm = sum(DATA.received, type, (d) => d.issued_on.startsWith(prefix));
          const ry = sum(DATA.received, type, (d) => d.issued_on.startsWith(String(year)) && d.issued_on <= `${prefix}-31`);
          return {
            document_type: type,
            issued: { month_count: im.count, month_amount: im.amount, year_count: iy.count, year_amount: iy.amount },
            received: { month_count: rm.count, month_amount: rm.amount, year_count: ry.count, year_amount: ry.amount },
          };
        })
      : [],
  };
}

/** Answer like the API would, with a trace and a believable delay. */
export async function demo<T>(path: string, body: Record<string, unknown>, data: T): Promise<Result<T>> {
  const ms = 350 + Math.floor(Math.random() * 650);
  await new Promise((resolve) => setTimeout(resolve, ms));
  return {
    ok: true,
    data,
    trace: { id: crypto.randomUUID(), at: new Date().toISOString(), method: "POST", path, body, status: 200, ms, response: preview({ data }), demo: true },
  };
}

// ─── Files ──────────────────────────────────────────────────────────────────

function ublXml(doc: Seeded): string {
  const lines = doc.lines
    .map(
      (line) => `  <cac:InvoiceLine>
    <cbc:ID>${line.number}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${line.unit}">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${line.line_total}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>${line.description}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="COP">${line.unit_price}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:ID>${doc.series ?? ""}${doc.number}</cbc:ID>
  <cbc:UUID schemeName="CUFE-SHA384">${doc.cufe}</cbc:UUID>
  <cbc:IssueDate>${doc.issued_on}</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme>
    <cbc:RegistrationName>${doc.issuer.name}</cbc:RegistrationName>
    <cbc:CompanyID schemeName="31">${doc.issuer.nit}</cbc:CompanyID>
  </cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyTaxScheme>
    <cbc:RegistrationName>${doc.recipient.name}</cbc:RegistrationName>
    <cbc:CompanyID schemeName="31">${doc.recipient.nit}</cbc:CompanyID>
  </cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="COP">${doc.taxes?.iva ?? 0}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="COP">${doc.total}</cbc:PayableAmount></cac:LegalMonetaryTotal>
${lines}
</Invoice>
`;
}

/** A one-page PDF of the invoice, written by hand so the sample needs no PDF library. */
function invoicePdf(doc: Seeded): Uint8Array {
  const money = (n: number | null) => `$ ${(n ?? 0).toLocaleString("es-CO")}`;
  const ascii = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[()\\]/g, "");
  const rows: [number, number, number, string][] = [
    [50, 780, 18, ascii(doc.document_type ?? "Factura")],
    [50, 758, 11, `No. ${doc.series ?? ""}${doc.number}   Fecha ${doc.issued_on}`],
    [50, 720, 10, `Emisor: ${ascii(doc.issuer.name ?? "")}  NIT ${doc.issuer.nit}`],
    [50, 704, 10, `Cliente: ${ascii(doc.recipient.name ?? "")}  NIT ${doc.recipient.nit}`],
    [50, 670, 9, "DESCRIPCION                                   CANT        VALOR"],
  ];
  doc.lines.forEach((line, i) => {
    rows.push([50, 650 - i * 16, 10, `${ascii(line.description ?? "").padEnd(44).slice(0, 44)}  ${String(line.quantity).padStart(4)}   ${money(line.line_total)}`]);
  });
  const y = 630 - doc.lines.length * 16;
  rows.push([330, y - 10, 10, `IVA ${money(doc.taxes?.iva ?? 0)}`]);
  rows.push([330, y - 30, 13, `Total ${money(doc.total)}`]);
  rows.push([50, 90, 7, `CUFE ${doc.cufe.slice(0, 48)}`]);
  rows.push([50, 80, 7, `     ${doc.cufe.slice(48)}`]);
  rows.push([50, 60, 8, "Documento de ejemplo generado por el playground. Sin validez fiscal."]);
  const stream = rows.map(([x, yy, size, text]) => `BT /F1 ${size} Tf ${x} ${yy} Td (${text}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
