#!/usr/bin/env npx tsx
/**
 * CLI receipt verifier — mirrors /verify page checks.
 * Usage: npm run verify:receipt -- 0x<receiptId> [--doc "document text"]
 */
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { hashDocument } from "@/lib/hashing";
import { inferenceRegistryAbi } from "@/lib/contracts";

const args = process.argv.slice(2);
const receiptId = args[0] as `0x${string}` | undefined;
const docIdx = args.indexOf("--doc");
const documentText = docIdx >= 0 ? args[docIdx + 1] : undefined;

if (!receiptId) {
  console.error("Usage: npm run verify:receipt -- 0x<receiptId> [--doc \"document text\"]");
  process.exit(1);
}

const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "https://sepolia.base.org";
const inferenceRegistry = (process.env.NEXT_PUBLIC_INFERENCE_REGISTRY ?? "0x") as `0x${string}`;

const ZERO_HASH = `0x${"0".repeat(64)}` as `0x${string}`;

function isEnsemble(receipt: {
  agreementScore: number;
  secondOutputHash: `0x${string}`;
}) {
  return receipt.agreementScore > 0 && receipt.secondOutputHash !== ZERO_HASH;
}

async function main() {
  const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
  const checks: { label: string; ok: boolean; detail?: string }[] = [];

  try {
    const receipt = await client.readContract({
      address: inferenceRegistry,
      abi: inferenceRegistryAbi,
      functionName: "getReceipt",
      args: [receiptId],
    });

    checks.push({ label: "Receipt exists", ok: receipt.timestamp > 0n });
    checks.push({ label: "Coherence ≥ 80", ok: receipt.coherenceScore >= 80 });
    checks.push({ label: "Payment settled", ok: receipt.paid });
    checks.push({ label: "Model recorded", ok: Boolean(receipt.modelId) });

    if (isEnsemble(receipt)) {
      checks.push({ label: "Agreement ≥ 80", ok: receipt.agreementScore >= 80, detail: String(receipt.agreementScore) });
      checks.push({ label: "Second model recorded", ok: Boolean(receipt.secondModelId), detail: receipt.secondModelId });
    }

    if (documentText !== undefined) {
      const inputHash = hashDocument(documentText);
      const matches = receipt.inputHash.toLowerCase() === inputHash.toLowerCase();
      checks.push({
        label: "Input hash match",
        ok: matches,
        detail: matches ? undefined : `${receipt.inputHash} vs ${inputHash}`,
      });

      if (matches) {
        try {
          if (isEnsemble(receipt)) {
            const ok = await client.readContract({
              address: inferenceRegistry,
              abi: inferenceRegistryAbi,
              functionName: "verifyEnsembleReceipt",
              args: [receiptId, inputHash, receipt.outputHash, receipt.secondOutputHash],
            });
            checks.push({ label: "verifyEnsembleReceipt()", ok: Boolean(ok) });
          } else {
            const ok = await client.readContract({
              address: inferenceRegistry,
              abi: inferenceRegistryAbi,
              functionName: "verifyReceipt",
              args: [receiptId, inputHash, receipt.outputHash],
            });
            checks.push({ label: "verifyReceipt()", ok: Boolean(ok) });
          }
        } catch {
          checks.push({ label: "Contract verify", ok: false });
        }
      }
    }
  } catch {
    checks.push({ label: "Receipt exists", ok: false });
  }

  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
  }

  const verdict = checks.every((c) => c.ok) ? "pass" : "fail";
  console.log(`\nVerdict: ${verdict.toUpperCase()}`);
  process.exit(verdict === "pass" ? 0 : 1);
}

main();
