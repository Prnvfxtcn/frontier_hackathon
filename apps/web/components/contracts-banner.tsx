"use client";

import { useEffect, useState } from "react";
import { checkContractsDeployed } from "@/lib/contracts-health";
import { isLocalRpc } from "@/lib/aegis-client";

export function ContractsBanner() {
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    checkContractsDeployed().then(({ missing: m }) => setMissing(m));
  }, []);

  if (missing.length === 0) return null;

  return (
    <div className="border-b border-rose-300/60 bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3 text-sm text-rose-950">
      <div className="mx-auto max-w-6xl">
        <p className="font-semibold">Contracts not found on this chain</p>
        <p className="mt-1 text-rose-800/90">
          {isLocalRpc ? (
            <>
              Anvil was reset or addresses are stale. Redeploy locally, or deploy to public Base Sepolia for
              judge-visible proofs:
            </>
          ) : (
            <>Update <code className="rounded bg-rose-100 px-1">.env</code> with deployed addresses, then run{" "}
              <code className="rounded bg-rose-100 px-1">./scripts/sync-env.sh</code>.</>
          )}
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-rose-950/90 p-3 font-mono text-xs text-rose-50">
{isLocalRpc
  ? `cd packages/contracts
export DEPLOYER_PRIVATE_KEY=0xac0974...
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Public (judges):
./scripts/deploy-base-sepolia.sh`
  : `./scripts/deploy-base-sepolia.sh
./scripts/seed-public-demo.sh`}
        </pre>
        <p className="mt-2 text-xs text-rose-700">
          Missing: {missing.join(", ")}
        </p>
      </div>
    </div>
  );
}
