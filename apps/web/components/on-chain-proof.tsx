"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, SectionTitle, Button, Pill } from "@/components/ui";
import {
  DEMO_RECEIPT_ID,
  fetchReceiptProvenance,
  publicChainSummary,
  publicVerifyUrl,
  explorerAddress,
  explorerTx,
} from "@/lib/public-provenance";
import { contractAddresses } from "@/lib/contracts";

type Props = {
  receiptId: string;
};

export function OnChainProof({ receiptId }: Props) {
  const [copied, setCopied] = useState(false);
  const [prov, setProv] = useState<Awaited<ReturnType<typeof fetchReceiptProvenance>>>(null);
  const chain = publicChainSummary();

  useEffect(() => {
    if (!receiptId.startsWith("0x") || receiptId.length !== 66) return;
    void fetchReceiptProvenance(receiptId as `0x${string}`).then(setProv);
  }, [receiptId]);

  async function copyShareLink() {
    await navigator.clipboard.writeText(publicVerifyUrl(receiptId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <SectionTitle
        title="Public verification"
        description={
          chain.isPublic
            ? "Anyone can re-run these checks via public RPC and Basescan — no wallet or local setup."
            : "Switch to public Base Sepolia (see scripts/deploy-base-sepolia.sh) for judge-visible proofs."
        }
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill variant={chain.isPublic ? "success" : "warning"}>
          {chain.isPublic ? chain.networkLabel : "Local Anvil (not publicly verifiable)"}
        </Pill>
        {DEMO_RECEIPT_ID && receiptId !== DEMO_RECEIPT_ID && (
          <Link href={`/verify?id=${DEMO_RECEIPT_ID}`} className="text-xs font-semibold text-teal-700 underline">
            Try demo receipt
          </Link>
        )}
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="font-semibold text-slate-700">Shareable verify URL</dt>
          <dd className="mt-1 break-all font-mono text-xs text-slate-600">{publicVerifyUrl(receiptId)}</dd>
          <Button className="mt-2" size="sm" variant="secondary" onClick={() => void copyShareLink()}>
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">InferenceRegistry (read contract)</dt>
          <dd className="mt-1">
            <a
              href={explorerAddress(contractAddresses.inferenceRegistry)}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-xs text-teal-700 underline"
            >
              {contractAddresses.inferenceRegistry}
            </a>
          </dd>
        </div>
        {prov?.txHash && (
          <div>
            <dt className="font-semibold text-slate-700">Mint transaction</dt>
            <dd className="mt-1">
              <a
                href={explorerTx(prov.txHash)}
                target="_blank"
                rel="noreferrer"
                className="break-all font-mono text-xs text-teal-700 underline"
              >
                {prov.txHash}
              </a>
              {prov.blockNumber != null && (
                <span className="ml-2 text-xs text-slate-500">block {prov.blockNumber.toString()}</span>
              )}
            </dd>
          </div>
        )}
        {prov?.receipt && (
          <>
            <div>
              <dt className="font-semibold text-slate-700">On-chain input hash</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-600">{prov.receipt.inputHash}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">On-chain output hash</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-600">{prov.receipt.outputHash}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Coherence / paid / model</dt>
              <dd className="mt-1 text-xs text-slate-600">
                score {prov.receipt.coherenceScore} · paid {prov.receipt.paid ? "yes" : "no"} ·{" "}
                {prov.receipt.modelId || "—"}
              </dd>
            </div>
          </>
        )}
      </dl>
    </Card>
  );
}
