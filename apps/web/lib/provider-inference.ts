import type { ExtractResponse } from "./types";

export const ENSEMBLE_REJECTION_BANNER = "⛔ Ensemble gate rejected — receipt NOT minted";
export const AGREEMENT_THRESHOLD = 80;

export function shouldBlockReceiptMint(extract: ExtractResponse): boolean {
  return !extract.admissible;
}

export function isEnsembleGateRejected(extract: ExtractResponse | null): boolean {
  return Boolean(extract?.ensemble && extract.admissible === false);
}

/** @deprecated use isEnsembleGateRejected */
export function showEnsembleRejectionBanner(
  extract: ExtractResponse | null,
  _forceDisagree?: boolean
): boolean {
  return isEnsembleGateRejected(extract);
}

export function ensembleRejectionSubtitle(extract: ExtractResponse): string {
  const overall = extract.agreement?.overall ?? extract.agreementScore ?? 0;
  return `Agreement ${overall}% is below the ${AGREEMENT_THRESHOLD}% admissibility threshold. No on-chain record was created.`;
}

export function fieldDisagrees(perField: Record<string, number> | undefined, key: string): boolean {
  if (!perField) return false;
  return (perField[key] ?? 1) < 0.6;
}

export type MintInferenceResult =
  | { minted: true }
  | { minted: false; banner: string | null; reason: string };

/** Pure gate used by Provider before calling recordInference. */
export function evaluateExtractForMint(
  extract: ExtractResponse,
  _forceDisagree?: boolean
): MintInferenceResult {
  if (shouldBlockReceiptMint(extract)) {
    const banner = isEnsembleGateRejected(extract) ? ENSEMBLE_REJECTION_BANNER : null;
    return {
      minted: false,
      banner,
      reason: extract.rejectReason ?? banner ?? "Inference not admissible — no receipt minted.",
    };
  }
  return { minted: true };
}

export function logEnsembleResponse(extract: ExtractResponse, forceDisagreeToggle: boolean): void {
  const willMint = !shouldBlockReceiptMint(extract);
  console.info("[Aegis] ensemble response", {
    admissible: extract.admissible,
    agreement: extract.agreement?.overall ?? extract.agreementScore,
    forceDisagree: extract.forceDisagree ?? forceDisagreeToggle,
    willMint,
  });
  if (!willMint) {
    console.info("[Aegis] gate rejected — no recordInference call");
  }
}

/** First failing guard for Run Inference — mirrors runInference() preconditions. */
export function getRunInferenceBlockReason(params: {
  address?: string;
  documentText: string;
  consentId: string;
  loading: boolean;
}): string | null {
  if (params.loading) return "Running inference…";
  if (!params.address) return "Connect wallet";
  if (!params.documentText.trim()) return "Load a document";
  if (!params.consentId.trim()) return "Select a consent";
  return null;
}
