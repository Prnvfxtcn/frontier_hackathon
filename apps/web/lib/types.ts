export type Purpose = 0 | 1 | 2;

export interface ConsentGrant {
  patient: `0x${string}`;
  provider: `0x${string}`;
  scopeHash: `0x${string}`;
  purpose: Purpose;
  issuedAt: bigint;
  expiresAt: bigint;
  revoked: boolean;
}

export interface Receipt {
  consentId: `0x${string}`;
  provider: `0x${string}`;
  patientRef: `0x${string}`;
  inputHash: `0x${string}`;
  outputHash: `0x${string}`;
  promptHash: `0x${string}`;
  merkleRoot: `0x${string}`;
  modelId: string;
  modelVersion: `0x${string}`;
  coherenceScore: number;
  timestamp: bigint;
  paid: boolean;
  secondModelId: string;
  secondModelVersion: `0x${string}`;
  secondOutputHash: `0x${string}`;
  agreementScore: number;
}

export interface ExtractField {
  key: string;
  value: string | null;
  sourceSpan: { start: number; end: number };
  grounding: number;
}

export interface EnsembleModelResult {
  fields: ExtractField[];
  coherenceScore: number;
  rigors: ExtractResponse["rigors"];
  modelId: string;
  modelVersion: string;
  modelDigest?: string;
  outputHash: string;
  mock?: boolean;
}

export interface ExtractResponse {
  fields: ExtractField[];
  coherenceScore: number;
  rigors: {
    fidelity: boolean;
    conservation: boolean;
    austerity: boolean;
    coherence: boolean;
  };
  admissible: boolean;
  modelId: string;
  modelVersion: string;
  promptHash: string;
  inputHash: string;
  outputHash: string;
  mock?: boolean;
  ensemble?: boolean;
  models?: EnsembleModelResult[];
  agreement?: { perField: Record<string, number>; overall: number };
  secondModelId?: string;
  secondModelVersion?: string;
  secondOutputHash?: string;
  agreementScore?: number;
  rejectReason?: string;
  forceDisagree?: boolean;
  mutatedField?: string;
  digestA?: string;
  digestB?: string;
  secondModelDigest?: string;
  fhirBundle?: Record<string, unknown>;
}

export interface VerifyCheck {
  label: string;
  ok: boolean;
  detail?: string;
}

export interface VerifyResult {
  checks: VerifyCheck[];
  verdict: "pass" | "fail";
}

export const FIELD_CATEGORIES = [
  "patientName",
  "dob",
  "diagnosis",
  "medications",
  "allergies",
  "followUp",
] as const;

export const PURPOSE_LABELS = ["TREATMENT", "BILLING", "RESEARCH"] as const;

export const SAMPLE_DOCS = [
  { id: "discharge-summary-1", label: "Discharge Summary #1", path: "/samples/discharge-summary-1.txt" },
  { id: "progress-note-2", label: "Progress Note #2", path: "/samples/progress-note-2.txt" },
  { id: "lab-report-3", label: "Lab Report #3", path: "/samples/lab-report-3.txt" },
] as const;
