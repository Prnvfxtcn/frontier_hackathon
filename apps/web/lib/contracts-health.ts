import { aegisPublicClient } from "./aegis-client";
import { contractAddresses } from "./contracts";

export type ContractsHealth = {
  ok: boolean;
  missing: string[];
};

/** Returns false if any configured address has no bytecode on the current RPC. */
export async function checkContractsDeployed(): Promise<ContractsHealth> {
  const entries = Object.entries(contractAddresses) as [string, `0x${string}`][];
  const missing: string[] = [];

  await Promise.all(
    entries.map(async ([name, address]) => {
      if (!address || address === "0x") {
        missing.push(name);
        return;
      }
      try {
        const code = await aegisPublicClient.getBytecode({ address });
        if (!code || code === "0x") missing.push(name);
      } catch {
        missing.push(name);
      }
    })
  );

  return { ok: missing.length === 0, missing };
}

export async function waitForTx(hash: `0x${string}`, hint?: string) {
  const receipt = await aegisPublicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error(
      hint ??
        "Transaction reverted on-chain. Common causes: invalid consent, insufficient mUSDC balance, or agreement below threshold."
    );
  }
  return receipt;
}
