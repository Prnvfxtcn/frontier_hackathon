import { keccak256, toBytes } from "viem";
import type { ExtractField, ExtractResponse } from "./types";

/** Canonical input hash: keccak256(UTF-8 document bytes). */
export function hashDocument(documentText: string): `0x${string}` {
  return keccak256(toBytes(documentText));
}

/** Sorted-key JSON of field values only (grounding scores excluded). */
export function canonicalFieldValues(
  fields: Pick<ExtractField, "key" | "value">[]
): string {
  const payload: Record<string, string | null> = {};
  for (const f of fields) {
    payload[f.key] = f.value;
  }
  const sortedKeys = Object.keys(payload).sort();
  const ordered: Record<string, string | null> = {};
  for (const k of sortedKeys) {
    ordered[k] = payload[k];
  }
  return JSON.stringify(ordered);
}

/** Canonical output hash: keccak256(canonical field JSON). */
export function hashFields(fields: ExtractField[]): `0x${string}` {
  return keccak256(toBytes(canonicalFieldValues(fields)));
}

/** keccak256(UTF-8 digest string) — stored on-chain as modelVersion / secondModelVersion. */
export function hashModelDigest(digest: string): `0x${string}` {
  return keccak256(toBytes(digest));
}

export function applyModelVersions<T extends ExtractResponse>(extract: T): T {
  const next: T = { ...extract };
  if (extract.digestA) {
    next.modelVersion = hashModelDigest(extract.digestA);
  }
  if (extract.digestB) {
    next.secondModelVersion = hashModelDigest(extract.digestB);
  }
  if (extract.models?.length) {
    next.models = extract.models.map((model, index) => {
      const digest = index === 0 ? extract.digestA : extract.digestB;
      return digest
        ? { ...model, modelDigest: digest, modelVersion: hashModelDigest(digest) }
        : model;
    });
  }
  return next;
}

export function applyExtractHashes<T extends ExtractResponse>(
  extract: T,
  documentText: string
): T & { inputHash: string; outputHash: string } {
  const next: T & { inputHash: string; outputHash: string } = {
    ...extract,
    inputHash: hashDocument(documentText),
    outputHash: hashFields(extract.fields),
  };

  if (extract.ensemble && extract.models?.[1]) {
    const secondOutputHash = hashFields(extract.models[1].fields);
    next.secondOutputHash = secondOutputHash;
    next.models = extract.models.map((model, index) =>
      index === 1 ? { ...model, outputHash: secondOutputHash } : model
    );
  }

  return next;
}

/** Canonical second-model hash for verify — prefer stored mint value over re-hash. */
export function secondOutputHashFromExtract(extract: ExtractResponse): `0x${string}` | null {
  if (extract.secondOutputHash) {
    return extract.secondOutputHash as `0x${string}`;
  }
  if (extract.models?.[1]?.outputHash) {
    return extract.models[1].outputHash as `0x${string}`;
  }
  if (extract.models?.[1]?.fields) {
    return hashFields(extract.models[1].fields);
  }
  return null;
}
