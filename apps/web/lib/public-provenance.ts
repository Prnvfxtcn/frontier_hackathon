import type { Receipt } from "./types";
import { aegisPublicClient, isLocalRpc, NETWORK_LABEL } from "./aegis-client";
import {
  contractAddresses,
  explorerAddress,
  explorerTx,
  inferenceRegistryAbi,
} from "./contracts";

export const DEMO_RECEIPT_ID = process.env.NEXT_PUBLIC_DEMO_RECEIPT_ID as `0x${string}` | undefined;

export function publicVerifyUrl(receiptId: string, origin = ""): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/verify?id=${encodeURIComponent(receiptId)}`;
}

export type ReceiptProvenance = {
  receipt: Receipt;
  txHash: `0x${string}` | null;
  blockNumber: bigint | null;
};

export async function fetchReceiptProvenance(receiptId: `0x${string}`): Promise<ReceiptProvenance | null> {
  const receipt = (await aegisPublicClient.readContract({
    address: contractAddresses.inferenceRegistry,
    abi: inferenceRegistryAbi,
    functionName: "getReceipt",
    args: [receiptId],
  })) as Receipt;

  if (receipt.timestamp === 0n) return null;

  let txHash: `0x${string}` | null = null;
  let blockNumber: bigint | null = null;

  try {
    const logs = await aegisPublicClient.getLogs({
      address: contractAddresses.inferenceRegistry,
      event: {
        type: "event",
        name: "InferenceRecorded",
        inputs: [
          { name: "receiptId", type: "bytes32", indexed: true },
          { name: "consentId", type: "bytes32", indexed: true },
          { name: "provider", type: "address", indexed: true },
          { name: "patientRef", type: "bytes32", indexed: false },
          { name: "coherenceScore", type: "uint16", indexed: false },
          { name: "timestamp", type: "uint64", indexed: false },
        ],
      },
      args: { receiptId },
      fromBlock: 0n,
      toBlock: "latest",
    });
    const hit = logs[0];
    if (hit) {
      txHash = hit.transactionHash;
      blockNumber = hit.blockNumber;
    }
  } catch {
    /* optional */
  }

  return { receipt, txHash, blockNumber };
}

export function publicChainSummary() {
  return {
    isPublic: !isLocalRpc,
    networkLabel: NETWORK_LABEL,
    inferenceRegistry: contractAddresses.inferenceRegistry,
    explorerRegistry: explorerAddress(contractAddresses.inferenceRegistry),
  };
}

export { explorerTx, explorerAddress };
