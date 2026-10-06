export type Role = "admin" | "doctor" | "insurance_reviewer" | "staff";

export type User = {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export type Patient = {
  id?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  medical_history?: string | null;
};

export type Note = {
  id: string;
  body: string;
  user_id?: string | null;
  created_at: string;
};

export type Document = {
  id: string;
  filename: string;
  content_type: string;
  extracted_text?: string | null;
  doc_type?: string | null;
  entities?: Record<string, unknown> | null;
  created_at: string;
};

export type Extraction = {
  id: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type SourceRef = {
  document: string;
  excerpt: string;
};

export type DiagnosisItem = {
  name: string;
  icd10?: string | null;
  confidence?: number;
  source?: SourceRef | null;
};

export type MedicationItem = {
  name: string;
  dose?: string | null;
  frequency?: string | null;
  source?: SourceRef | null;
};

export type ProcedureItem = {
  name: string;
  source?: SourceRef | null;
};

export type Analysis = {
  id: string;
  case_id: string;
  summary: string;
  diagnoses: DiagnosisItem[];
  procedures: ProcedureItem[];
  medications: MedicationItem[];
  symptoms: string[];
  conditions: string[];
  key_findings: string[];
  missing_information: string[];
  risk_flags: string[];
  recommendations: string[];
  overall_confidence: number;
  findings: string[]; // legacy
  created_at: string;
};

export type Report = {
  id: string;
  decision: string;
  comments?: string | null;
  snapshot: Record<string, unknown>;
  created_by_id?: string | null;
  created_at: string;
};

export type Case = {
  id: string;
  organization_id: string;
  claim_number?: string | null;
  title: string;
  case_type: string;
  status: string;
  symptoms: string[];
  diagnoses: string[];
  treatments: string[];
  created_at: string;
  updated_at: string;
  patient: Patient;
  notes: Note[];
  documents: Document[];
  latest_extraction?: Extraction | null;
  latest_analysis?: Analysis | null;
  latest_report?: Report | null;
};

export type AuditLog = {
  id: string;
  organization_id: string;
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type Analytics = {
  cases_by_status: Record<string, number>;
  document_count: number;
  analysis_count: number;
  report_count: number;
  user_count: number;
};
