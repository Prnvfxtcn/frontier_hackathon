import type { ExtractResponse, Receipt, VerifyResult } from "./types";
import { publicClient, contractAddresses, consentRegistryAbi, inferenceRegistryAbi } from "./contracts";
import { DEFAULT_SCOPE_HASH } from "./crypto";
import { hashDocument, hashFields, hashModelDigest, secondOutputHashFromExtract } from "./hashing";
import { formatDigestBadge } from "./model-digest";

function isEnsembleReceipt(receipt: Receipt): boolean {
  return receipt.agreementScore > 0 && receipt.secondOutputHash !== `0x${"0".repeat(64)}`;
}

export async function verifyReceipt(params: {
  receiptId: `0x${string}`;
  documentText?: string;
  extract?: ExtractResponse;
}): Promise<VerifyResult> {
  const checks: VerifyResult["checks"] = [];

  let receipt: Receipt | null = null;
  try {
    receipt = (await publicClient.readContract({
      address: contractAddresses.inferenceRegistry,
      abi: inferenceRegistryAbi,
      functionName: "getReceipt",
      args: [params.receiptId],
    })) as Receipt;

    checks.push({
      label: "Receipt exists on-chain",
      ok: receipt.timestamp > 0n,
      detail: receipt.timestamp > 0n ? "Found" : "Not found",
    });
  } catch {
    checks.push({ label: "Receipt exists on-chain", ok: false, detail: "Contract read failed" });
    return { checks, verdict: "fail" };
  }

  if (params.documentText !== undefined) {
    const inputHash = hashDocument(params.documentText);
    const matches = receipt!.inputHash.toLowerCase() === inputHash.toLowerCase();
    checks.push({
      label: "Input hash match",
      ok: matches,
      detail: matches
        ? "Document matches on-chain input hash"
        : params.documentText.length > 0
          ? "Document was modified after the receipt was issued"
          : `${receipt!.inputHash} vs ${inputHash}`,
    });
  }

  if (params.extract) {
    const outputHash = hashFields(params.extract.fields);
    checks.push({
      label: "Output hash match (model A)",
      ok: receipt!.outputHash.toLowerCase() === outputHash.toLowerCase(),
      detail: `${receipt!.outputHash} vs ${outputHash}`,
    });
    checks.push({
      label: "Coherence score on-chain",
      ok: receipt!.coherenceScore === params.extract.coherenceScore,
      detail: `${receipt!.coherenceScore} vs ${params.extract.coherenceScore}`,
    });

    if (params.extract.digestA) {
      const expected = hashModelDigest(params.extract.digestA);
      const matches = receipt!.modelVersion.toLowerCase() === expected.toLowerCase();
      checks.push({
        label: "Model digest matches captured",
        ok: matches,
        detail: `${formatDigestBadge(params.extract.digestA)} → ${receipt!.modelVersion}`,
      });
    }

    if (params.extract.ensemble && params.extract.models?.[1] && isEnsembleReceipt(receipt!)) {
      const secondHash = secondOutputHashFromExtract(params.extract);
      const recomputed = hashFields(params.extract.models[1].fields);
      const matchesOnChain =
        secondHash != null &&
        receipt!.secondOutputHash.toLowerCase() === secondHash.toLowerCase();
      checks.push({
        label: "Second output hash match (model B)",
        ok: matchesOnChain,
        detail: matchesOnChain
          ? `${receipt!.secondOutputHash} (matches minted model B output)`
          : `${receipt!.secondOutputHash} vs ${secondHash ?? recomputed}`,
      });
      checks.push({
        label: "Agreement score on-chain",
        ok: receipt!.agreementScore === (params.extract.agreementScore ?? 0),
        detail: `${receipt!.agreementScore} vs ${params.extract.agreementScore ?? 0}`,
      });

      if (params.extract.digestB) {
        const expectedB = hashModelDigest(params.extract.digestB);
        const matchesB = receipt!.secondModelVersion.toLowerCase() === expectedB.toLowerCase();
        checks.push({
          label: "Model B digest matches captured",
          ok: matchesB,
          detail: `${formatDigestBadge(params.extract.digestB)} → ${receipt!.secondModelVersion}`,
        });
      }
    }

    if (params.documentText !== undefined && params.documentText.length > 0) {
      try {
        const inputHash = hashDocument(params.documentText);
        const outputHash = hashFields(params.extract.fields);
        if (isEnsembleReceipt(receipt!)) {
          const secondHash =
            secondOutputHashFromExtract(params.extract) ??
            hashFields(params.extract.models![1].fields);
          const onChainOk = await publicClient.readContract({
            address: contractAddresses.inferenceRegistry,
            abi: inferenceRegistryAbi,
            functionName: "verifyEnsembleReceipt",
            args: [params.receiptId, inputHash, outputHash, secondHash],
          });
          checks.push({
            label: "Contract verifyEnsembleReceipt()",
            ok: Boolean(onChainOk),
            detail: "Solidity view mirrors ensemble hash checks",
          });
        } else {
          const onChainOk = await publicClient.readContract({
            address: contractAddresses.inferenceRegistry,
            abi: inferenceRegistryAbi,
            functionName: "verifyReceipt",
            args: [params.receiptId, inputHash, outputHash],
          });
          checks.push({
            label: "Contract verifyReceipt()",
            ok: Boolean(onChainOk),
            detail: "Solidity view mirrors hash checks",
          });
        }
      } catch {
        checks.push({ label: "Contract verifyReceipt()", ok: false, detail: "Contract read failed" });
      }
    }
  }

  try {
    const consentValid = await publicClient.readContract({
      address: contractAddresses.consentRegistry,
      abi: consentRegistryAbi,
      functionName: "isConsentValid",
      args: [receipt!.consentId, receipt!.provider, DEFAULT_SCOPE_HASH],
    });
    checks.push({
      label: "Consent valid at verification",
      ok: Boolean(consentValid),
    });
  } catch {
    checks.push({ label: "Consent valid at verification", ok: false });
  }

  checks.push({
    label: "Coherence threshold (≥80)",
    ok: receipt!.coherenceScore >= 80,
    detail: String(receipt!.coherenceScore),
  });

  checks.push({
    label: "Payment settled",
    ok: receipt!.paid,
  });

  checks.push({
    label: "Model recorded",
    ok: Boolean(receipt!.modelId),
    detail: receipt!.modelId,
  });

  if (isEnsembleReceipt(receipt!)) {
    checks.push({
      label: "Agreement threshold (≥80)",
      ok: receipt!.agreementScore >= 80,
      detail: String(receipt!.agreementScore),
    });
    checks.push({
      label: "Second model recorded",
      ok: Boolean(receipt!.secondModelId),
      detail: receipt!.secondModelId,
    });
  }

  const verdict = checks.every((c) => c.ok) ? "pass" : "fail";
  return { checks, verdict };
}
