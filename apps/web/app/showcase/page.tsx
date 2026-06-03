"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { aegisPublicClient } from "@/lib/aegis-client";
import { Card, Button, PageHeader, SectionTitle, EmptyState, Pill } from "@/components/ui";
import { ShieldIcon } from "@/components/icons";
import { contractAddresses, explorerTx } from "@/lib/contracts";
import { DownloadCertificateButton } from "@/components/download-certificate-button";

type ShowcaseRow = {
  id: string;
  provider: string;
  score: number;
  agreement: number;
  secondModel: string;
  timestamp: number;
  txHash: string;
};

export default function ShowcasePage() {
  const publicClient = aegisPublicClient;
  const [receipts, setReceipts] = useState<ShowcaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const logs = await publicClient.getLogs({
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
            { name: "agreementScore", type: "uint16", indexed: false },
            { name: "secondModelId", type: "string", indexed: false },
          ],
        },
        fromBlock: 0n,
      });
      setReceipts(
        logs
          .map((l) => ({
            id: l.args.receiptId!,
            provider: l.args.provider!,
            score: Number(l.args.coherenceScore),
            agreement: Number(l.args.agreementScore ?? 0),
            secondModel: String(l.args.secondModelId ?? ""),
            timestamp: Number(l.args.timestamp),
            txHash: l.transactionHash,
          }))
          .reverse()
      );
    } catch {
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyId(id: string) {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        eyebrow="Public Registry"
        title="Showcase"
        description="Browse on-chain proof-of-inference receipts — verify any receipt independently."
        icon={<ShieldIcon className="h-7 w-7" />}
        actions={
          <Button variant="secondary" onClick={() => load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        }
        badge={<Pill variant="info">{receipts.length} receipts on-chain</Pill>}
      />

      <Card>
        <SectionTitle title="Live Receipts" description="Newest first · click ID to copy" />
        {receipts.length === 0 ? (
          <EmptyState
            title={loading ? "Loading receipts…" : "No receipts yet"}
            description="Run the golden path demo from Provider to mint your first receipt."
            action={
              !loading ? (
                <Link href="/provider">
                  <Button>Go to Provider →</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {receipts.map((r) => (
              <li
                key={r.id}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-gradient-to-r from-white to-slate-50/50 p-5 transition hover:-translate-y-0.5 hover:border-teal-200/60 hover:shadow-card-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Receipt ID</p>
                  <button
                    type="button"
                    onClick={() => copyId(r.id)}
                    className="mt-1 block w-full text-left font-mono text-xs break-all text-slate-800 transition group-hover:text-teal-700"
                    title="Click to copy"
                  >
                    {r.id}
                    {copiedId === r.id && (
                      <span className="ml-2 text-emerald-600">✓ copied</span>
                    )}
                  </button>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>Provider {r.provider.slice(0, 10)}…</span>
                    <span className="font-semibold text-teal-600">Coherence {r.score}</span>
                    {r.agreement > 0 && (
                      <span className="font-semibold text-indigo-600">Agreement {r.agreement}%</span>
                    )}
                    {r.secondModel && <span>Model B: {r.secondModel}</span>}
                    <span>{new Date(r.timestamp * 1000).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href={`/verify?id=${r.id}`}>
                    <Button size="sm">Verify →</Button>
                  </Link>
                  <DownloadCertificateButton receiptId={r.id} size="sm" />
                  <a href={explorerTx(r.txHash)} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm">Basescan →</Button>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
