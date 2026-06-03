import { describe, expect, it } from "vitest";
import { hashDocument, hashFields, hashModelDigest, applyModelVersions, canonicalFieldValues } from "./hashing";
import type { ExtractField } from "./types";

const sampleFields: ExtractField[] = [
  { key: "patientName", value: "Jane Doe", sourceSpan: { start: 0, end: 8 }, grounding: 1 },
  { key: "dob", value: "1980-01-01", sourceSpan: { start: 10, end: 20 }, grounding: 1 },
];

describe("hashing", () => {
  it("produces stable output hash for sorted canonical JSON", () => {
    const json = canonicalFieldValues(sampleFields);
    expect(json).toBe('{"dob":"1980-01-01","patientName":"Jane Doe"}');
    expect(hashFields(sampleFields)).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("changes inputHash when one character of document changes", () => {
    const doc = "Patient: Jane Doe\nDOB: 1980-01-01";
    const tampered = "Patient: Jane Doe\nDOB: 1980-01-02";
    expect(hashDocument(doc)).not.toEqual(hashDocument(tampered));
  });

  it("record-verify round-trip uses matching hashes", () => {
    const doc = "Patient: Jane Doe";
    const fields: ExtractField[] = [
      { key: "patientName", value: "Jane Doe", sourceSpan: { start: 9, end: 17 }, grounding: 1 },
      { key: "dob", value: null, sourceSpan: { start: 0, end: 0 }, grounding: 0 },
    ];
    const inputHash = hashDocument(doc);
    const outputHash = hashFields(fields);
    expect(inputHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(outputHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(hashDocument(doc)).toEqual(inputHash);
    expect(hashFields(fields)).toEqual(outputHash);
  });

  it("hashes Ollama digest strings for on-chain modelVersion slots", () => {
    const digest = "sha256:abcd1234ef567890";
    expect(hashModelDigest(digest)).toMatch(/^0x[a-f0-9]{64}$/);
    expect(hashModelDigest(digest)).toEqual(hashModelDigest(digest));
    expect(hashModelDigest(digest)).not.toEqual(hashModelDigest("sha256:other"));
  });

  it("applyModelVersions sets modelVersion from digestA and digestB", () => {
    const digestA = "sha256:aaaabbbbccccdddd";
    const digestB = "sha256:eeeeffff00001111";
    const updated = applyModelVersions({
      fields: [],
      coherenceScore: 90,
      rigors: {},
      admissible: true,
      modelId: "llama3.1:8b",
      modelVersion: "0xold",
      promptHash: "0x0",
      inputHash: "0x0",
      outputHash: "0x0",
      digestA,
      digestB,
      ensemble: true,
      secondModelId: "qwen2.5:7b",
    });
    expect(updated.modelVersion).toEqual(hashModelDigest(digestA));
    expect(updated.secondModelVersion).toEqual(hashModelDigest(digestB));
  });
});
