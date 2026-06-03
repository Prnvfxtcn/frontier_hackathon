import { parseGwei } from "viem";
import { isLocalRpc } from "./aegis-client";

/** Anvil base fee is 1 gwei; MetaMask often caches lower fees from other networks. */
export const localTxFees = {
  maxFeePerGas: parseGwei("20"),
  maxPriorityFeePerGas: parseGwei("2"),
} as const;

export function withLocalGas<const T extends Record<string, unknown>>(args: T): T {
  if (!isLocalRpc) return args;
  return { ...args, ...localTxFees };
}
