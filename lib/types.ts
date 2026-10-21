export type DocumentType = "CC" | "CE" | "TI" | "RC" | "PA" | "NIT";

export interface AccessRequest {
  sent: boolean;
  message: string | null;
  expires_in_minutes: number;
  requested_at: string;
}

export interface Connection {
  id: string;
  source: string;
  status: "active" | "rejected" | "exhausted" | string;
  display_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface Party {
  nit: string | null;
  name: string | null;
}

export interface ListedDocument {
  cufe: string;
  document_type_code: string | null;
  document_type: string | null;
  series: string | null;
  number: string | null;
  issued_on: string;
  received_at: string | null;
  issuer: Party;
  recipient: Party;
  currency: string | null;
  payment_form: string | null;
  payment_method: string | null;
  taxes: Record<string, number | null> | null;
  withholdings: Record<string, number | null> | null;
  total: number | null;
  status: string | null;
  radian_status: string | null;
}

export interface DocumentList {
  from_date: string;
  to_date: string;
  taxpayer: Party;
  count: number;
  by_type: { document_type: string; count: number; total: number }[];
  documents: ListedDocument[];
}

export interface DocumentLine {
  number: string | null;
  code: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
}

export interface FullDocument {
  found: boolean;
  cufe: string;
  document_type: string | null;
  series: string | null;
  number: string | null;
  issued_on: string | null;
  issued_at: string | null;
  due_on: string | null;
  issuer: Party | null;
  recipient: Party | null;
  currency: string | null;
  notes: string[];
  lines: DocumentLine[];
  totals: Record<string, number | null> | null;
  taxes: { name: string; value: number | null }[];
  total: number | null;
  legitimate_holder: string | null;
  validations: { name: string | null; result: string | null; detail: string | null }[];
  events: { code: string | null; name: string | null; date: string | null; issuer: Party; recipient: Party }[];
  xml: string | null;
  pdf_base64: string | null;
}

interface Flow {
  month_count: number | null;
  month_amount: number | null;
  year_count: number | null;
  year_amount: number | null;
}

export interface MonthlyReport {
  year: number;
  month: number;
  available: boolean;
  reference: string | null;
  dated_on: string | null;
  cutoff_date: string | null;
  replaces_previous: boolean | null;
  documents: { document_type: string; issued: Flow; received: Flow }[];
}

export interface Profile {
  nit: string | null;
  name: string | null;
  business_name: string | null;
  email: string | null;
  status: string | null;
  reception_email: string | null;
  legal_representatives: { document_number: string | null; name: string | null; email: string | null }[];
  operation_modes: { mode: string | null; registered_on: string | null; software: string | null }[];
  numbering_ranges: {
    provider: string | null;
    software: string | null;
    document_type: string | null;
    prefix: string | null;
    resolution: string | null;
    from_number: number | string | null;
    to_number: number | string | null;
    associated_on: string | null;
    expires_on: string | null;
  }[];
}
