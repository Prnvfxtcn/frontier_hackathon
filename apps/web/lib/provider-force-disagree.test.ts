import { describe, expect, it, vi } from "vitest";
import type { ExtractResponse } from "./types";
import {
  ENSEMBLE_REJECTION_BANNER,
  evaluateExtractForMint,
  getRunInferenceBlockReason,
  isEnsembleGateRejected,
  normalizeConsentId,
  showEnsembleRejectionBanner,
} from "./provider-inference";

const VALID_CONSENT =
  "0x806726fa0131e30d352221755b9afd29d50dd5637995d0e7720b7e38e1ab12cd" as const;

function mockEnsembleExtract(overrides: Partial<ExtractResponse> = {}): ExtractResponse {
  return {
    fields: [{ key: "patientName", value: "Jane Martinez", sourceSpan: { start: 0, end: 13 }, grounding: 1 }],
    coherenceScore: 100,
    rigors: { fidelity: true, conservation: true, austerity: true, coherence: true },
    admissible: true,
    modelId: "llama3.1:8b",
    modelVersion: "0xabc",
    promptHash: "0x1",
    inputHash: "0x2",
    outputHash: "0x3",
    ensemble: true,
    agreementScore: 100,
    agreement: { overall: 100, perField: { patientName: 1, dob: 1, diagnosis: 1, medications: 1, allergies: 1, followUp: 1 } },
    models: [
      {
        modelId: "llama3.1:8b",
        modelVersion: "0xabc",
        outputHash: "0x3",
        coherenceScore: 100,
        rigors: { fidelity: true, conservation: true, austerity: true, coherence: true },
        fields: [{ key: "dob", value: "1980-01-01", sourceSpan: { start: 0, end: 10 }, grounding: 1 }],
      },
      {
        modelId: "qwen2.5:7b",
        modelVersion: "0xdef",
        outputHash: "0x4",
        coherenceScore: 100,
        rigors: { fidelity: true, conservation: true, austerity: true, coherence: true },
        fields: [{ key: "dob", value: "1980-01-02", sourceSpan: { start: 0, end: 10 }, grounding: 1 }],
      },
    ],
    ...overrides,
  };
}

export async function mintReceiptIfAdmissible(
  extract: ExtractResponse,
  forceDisagree: boolean,
  recordInference: () => Promise<unknown>
): Promise<{ minted: boolean; banner: string | null }> {
  const gate = evaluateExtractForMint(extract, forceDisagree);
  if (!gate.minted) {
    return { minted: false, banner: gate.banner };
  }
  await recordInference();
  return { minted: true, banner: null };
}

describe("force disagree ensemble gate", () => {
  it("shows rejection banner for any inadmissible ensemble extract", () => {
    const extract = mockEnsembleExtract({
      admissible: false,
      agreementScore: 79,
      agreement: { overall: 79, perField: { dob: 0.98, patientName: 1, diagnosis: 1, medications: 1, allergies: 1, followUp: 1 } },
    });

    expect(isEnsembleGateRejected(extract)).toBe(true);
    expect(showEnsembleRejectionBanner(extract, false)).toBe(true);
  });

  it("shows rejection banner when forceDisagree extract is inadmissible", () => {
    const extract = mockEnsembleExtract({
      admissible: false,
      forceDisagree: true,
      agreementScore: 79,
      agreement: { overall: 79, perField: { dob: 0.98, patientName: 1, diagnosis: 1, medications: 1, allergies: 1, followUp: 1 } },
      rejectReason: "Forced disagreement demo",
    });

    expect(isEnsembleGateRejected(extract)).toBe(true);
    const gate = evaluateExtractForMint(extract, true);
    expect(gate.minted).toBe(false);
    expect(gate.banner).toBe(ENSEMBLE_REJECTION_BANNER);
  });

  it("does not call recordInference when force_disagree rejects admissible-looking doc", async () => {
    const extract = mockEnsembleExtract({
      admissible: false,
      forceDisagree: true,
      agreementScore: 79,
      agreement: { overall: 79, perField: { dob: 0.98, patientName: 1, diagnosis: 1, medications: 1, allergies: 1, followUp: 1 } },
    });
    const recordInference = vi.fn();

    const result = await mintReceiptIfAdmissible(extract, true, recordInference);

    expect(recordInference).not.toHaveBeenCalled();
    expect(result.minted).toBe(false);
    expect(result.banner).toBe(ENSEMBLE_REJECTION_BANNER);
  });

  it("calls recordInference when ensemble is admissible without force disagree", async () => {
    const extract = mockEnsembleExtract({ admissible: true, agreementScore: 100 });
    const recordInference = vi.fn().mockResolvedValue("0xtx");

    const result = await mintReceiptIfAdmissible(extract, false, recordInference);

    expect(recordInference).toHaveBeenCalledOnce();
    expect(result.minted).toBe(true);
  });
});

describe("getRunInferenceBlockReason", () => {
  it("returns first failing guard in handler order", () => {
    expect(getRunInferenceBlockReason({ documentText: "doc", consentId: "0x1", loading: false })).toBe(
      "Connect wallet"
    );
    expect(
      getRunInferenceBlockReason({ address: "0xabc", documentText: "", consentId: "0x1", loading: false })
    ).toBe("Load a document");
    expect(
      getRunInferenceBlockReason({ address: "0xabc", documentText: "doc", consentId: "", loading: false })
    ).toBe("Select a consent");
    expect(
      getRunInferenceBlockReason({ address: "0xabc", documentText: "doc", consentId: "0x1", loading: false })
    ).toBe("Consent ID invalid — pick from the dropdown (0x + 64 hex chars)");
    expect(
      getRunInferenceBlockReason({
        address: "0xabc",
        documentText: "doc",
        consentId: VALID_CONSENT,
        loading: false,
      })
    ).toBeNull();
  });
});

describe("normalizeConsentId", () => {
  it("extracts first valid bytes32 from corrupted input", () => {
    const corrupted = `${VALID_CONSENT}806726fa0131e30d352221755b9afd29d50dd5637995d0e7720b7e38e1`;
    expect(normalizeConsentId(corrupted)).toBe(VALID_CONSENT);
  });

  it("returns null when no valid bytes32 present", () => {
    expect(normalizeConsentId("0xabc")).toBeNull();
  });
});
