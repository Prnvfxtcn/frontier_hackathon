import MerkleTree from "merkletreejs";
import { keccak256, toBytes } from "viem";
import type { ExtractField } from "./types";

function hashLeaf(data: Buffer): Buffer {
  const hex = keccak256(data);
  return Buffer.from(hex.slice(2), "hex");
}

function leafHash(key: string, value: string | null): Buffer {
  const payload = `${key}:${value ?? "null"}`;
  return hashLeaf(Buffer.from(payload));
}

export function buildMerkleRoot(fields: ExtractField[]): `0x${string}` {
  const leaves = fields.map((f) => leafHash(f.key, f.value));
  if (leaves.length === 0) return keccak256(toBytes("empty"));
  const tree = new MerkleTree(leaves, hashLeaf, { sortPairs: true });
  return `0x${tree.getRoot().toString("hex")}` as `0x${string}`;
}

export function getInclusionProof(fields: ExtractField[], key: string): string[] {
  const leaves = fields.map((f) => leafHash(f.key, f.value));
  const tree = new MerkleTree(leaves, hashLeaf, { sortPairs: true });
  const field = fields.find((f) => f.key === key);
  if (!field) return [];
  const leaf = leafHash(field.key, field.value);
  return tree.getProof(leaf).map((p) => `0x${p.data.toString("hex")}`);
}
