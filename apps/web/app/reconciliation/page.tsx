"use client";

import { useEffect, useState } from "react";
import { aegisPublicClient } from "@/lib/aegis-client";
import { parseAbiItem, formatUnits } from "viem";
import { Card, Button, PageHeader, SectionTitle, StatCard, EmptyState } from "@/components/ui";
import { ChainIcon } from "@/components/icons";
import { contractAddresses, settlementAbi } from "@/lib/contracts";

type PaymentRow = {
  receiptId: string;
  provider: string;
  amount: string;
  timestamp: number;
};

export default function ReconciliationPage() {
  const publicClient = aegisPublicClient;
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState("0");

  useEffect(() => {
    async function load() {
      if (!publicClient) return;
      try {
        const logs = await publicClient.getLogs({
          address: contractAddresses.settlement,
          event: parseAbiItem(
            "event PaymentSettled(bytes32 indexed receiptId, address indexed provider, uint256 amount, uint256 timestamp)"
          ),
          fromBlock: 0n,
        });
        const mapped = logs.map((l) => ({
          receiptId: l.args.receiptId!,
          provider: l.args.provider!,
          amount: formatUnits(l.args.amount!, 6),
          timestamp: Number(l.args.timestamp),
        }));
        setRows(mapped.reverse());
        const sum = mapped.reduce((acc, r) => acc + Number(r.amount), 0);
        setTotal(sum.toFixed(2));
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [publicClient]);

  function exportCsv() {
    const header = "receiptId,provider,amount,timestamp\n";
    const body = rows.map((r) => `${r.receiptId},${r.provider},${r.amount},${r.timestamp}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aegis-reconciliation.csv";
    a.click();
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        eyebrow="HB 2080 Payment Readiness"
        title="Reconciliation"
        description="Per-inference mock USDC settlement — audit trail for every paid inference."
        icon={<ChainIcon className="h-7 w-7" />}
        actions={<Button variant="secondary" onClick={exportCsv}>Export CSV</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Settled" value={`${total} mUSDC`} accent="emerald" />
        <StatCard label="Transactions" value={String(rows.length)} sub="On-chain payment events" accent="teal" />
      </div>

      <Card>
        <SectionTitle title="Settlement Ledger" description="All PaymentSettled events from the Settlement contract" />
        {rows.length === 0 ? (
          <EmptyState title="No payments yet" description="Run an inference from the Provider dashboard to settle payment." />
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.receiptId}
                    className={`border-b border-slate-100 transition hover:bg-teal-50/30 ${
                      i % 2 === 0 ? "bg-white/50" : "bg-slate-50/30"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-teal-700">{r.receiptId.slice(0, 18)}…</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.provider.slice(0, 12)}…</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{r.amount} mUSDC</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.timestamp * 1000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
