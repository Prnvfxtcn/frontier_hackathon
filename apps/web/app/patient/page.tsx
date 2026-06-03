"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { aegisPublicClient } from "@/lib/aegis-client";
import { parseAbiItem } from "viem";
import { Card, Button, Badge, PageHeader, SectionTitle, Input, Select, Alert, EmptyState, Pill } from "@/components/ui";
import { PatientIcon } from "@/components/icons";
import {
  consentRegistryAbi,
  contractAddresses,
  inferenceRegistryAbi,
} from "@/lib/contracts";
import { DEFAULT_SCOPE_HASH, hashScope } from "@/lib/crypto";
import { withLocalGas } from "@/lib/tx";
import { waitForTx } from "@/lib/contracts-health";
import { FIELD_CATEGORIES, PURPOSE_LABELS } from "@/lib/types";
import { ClientOnly } from "@/components/client-only";

type ConsentRow = {
  id: `0x${string}`;
  provider: string;
  expiresAt: number;
  revoked: boolean;
  status: "Active" | "Expired" | "Revoked";
};

type AccessRow = {
  receiptId: string;
  provider: string;
  coherenceScore: number;
  timestamp: number;
};

/** Format for <input type="datetime-local" /> */
function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Default: 30 days from now — long enough for demo without expiring mid-session */
function defaultConsentExpiry(): string {
  return formatDatetimeLocal(new Date(Date.now() + 30 * 86400000));
}

export default function PatientPage() {
  const { address, isConnected } = useAccount();
  const publicClient = aegisPublicClient;
  const { writeContractAsync } = useWriteContract();

  const [provider, setProvider] = useState("");
  const [purpose, setPurpose] = useState(0);
  const [expiry, setExpiry] = useState(defaultConsentExpiry);
  const [scope, setScope] = useState<string[]>([...FIELD_CATEGORIES]);
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [accessLog, setAccessLog] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);

  const scopeHash = hashScope(scope.length ? scope : [...FIELD_CATEGORIES]);

  async function loadConsents() {
    if (!publicClient || !address) return;
    try {
      const granted = await publicClient.getLogs({
        address: contractAddresses.consentRegistry,
        event: parseAbiItem(
          "event ConsentGranted(bytes32 indexed consentId, address indexed patient, address indexed provider, bytes32 scopeHash, uint64 expiresAt)"
        ),
        args: { patient: address },
        fromBlock: 0n,
      });

      const revoked = await publicClient.getLogs({
        address: contractAddresses.consentRegistry,
        event: parseAbiItem("event ConsentRevoked(bytes32 indexed consentId)"),
        fromBlock: 0n,
      });
      const revokedSet = new Set(revoked.map((r) => r.args.consentId));

      const rows: ConsentRow[] = granted.map((g) => {
        const expiresAt = Number(g.args.expiresAt);
        const isRevoked = revokedSet.has(g.args.consentId);
        const status = isRevoked ? "Revoked" : expiresAt * 1000 < Date.now() ? "Expired" : "Active";
        return {
          id: g.args.consentId!,
          provider: g.args.provider!,
          expiresAt,
          revoked: isRevoked,
          status,
        };
      });
      setConsents(rows);

      const inferences = await publicClient.getLogs({
        address: contractAddresses.inferenceRegistry,
        event: parseAbiItem(
          "event InferenceRecorded(bytes32 indexed receiptId, bytes32 indexed consentId, address indexed provider, bytes32 patientRef, uint16 coherenceScore, uint64 timestamp)"
        ),
        fromBlock: 0n,
      });

      const patientRef = (await import("@/lib/crypto")).patientRef(address);
      setAccessLog(
        inferences
          .filter((e) => e.args.patientRef === patientRef)
          .map((e) => ({
            receiptId: e.args.receiptId!,
            provider: e.args.provider!,
            coherenceScore: Number(e.args.coherenceScore),
            timestamp: Number(e.args.timestamp),
          }))
          .reverse()
      );
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadConsents();
  }, [publicClient, address]);

  async function grantConsent() {
    if (!address || !provider) return;
    setLoading(true);
    setMessage("");
    try {
      const expiresAt = Math.floor(new Date(expiry || Date.now() + 86400000).getTime() / 1000);
      const hash = await writeContractAsync(withLocalGas({
        address: contractAddresses.consentRegistry,
        abi: consentRegistryAbi,
        functionName: "grantConsent",
        args: [provider as `0x${string}`, scopeHash, purpose, BigInt(expiresAt)],
      }));
      await waitForTx(hash);
      setMessage("Consent granted on-chain.");
      await loadConsents();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Grant failed");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: `0x${string}`) {
    setLoading(true);
    try {
      const hash = await writeContractAsync(withLocalGas({
        address: contractAddresses.consentRegistry,
        abi: consentRegistryAbi,
        functionName: "revokeConsent",
        args: [id],
      }));
      await waitForTx(hash);
      await loadConsents();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        eyebrow="Data Owner"
        title="Patient Dashboard"
        description="Grant scoped consent and audit every inference run against your data."
        icon={<PatientIcon className="h-7 w-7" />}
        badge={
          <ClientOnly fallback={<Pill variant="info">Wallet status</Pill>}>
            {isConnected ? (
              <Pill variant="success">Wallet connected</Pill>
            ) : (
              <Pill variant="warning">Connect wallet to grant consent</Pill>
            )}
          </ClientOnly>
        }
      />

      {!isConnected && (
        <ClientOnly>
          <Alert variant="info">Connect your wallet on Base Sepolia to manage consent.</Alert>
        </ClientOnly>
      )}

      <Card>
        <SectionTitle title="Grant Consent" description="Authorize a provider with scoped field access" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Provider address (0x...)"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
          <Select value={purpose} onChange={(e) => setPurpose(Number(e.target.value))}>
            {PURPOSE_LABELS.map((p, i) => (
              <option key={p} value={i}>{p}</option>
            ))}
          </Select>
          <label className="block text-sm font-semibold text-slate-800 md:col-span-2">
            Consent expiry
            <Input
              className="mt-1.5"
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              title="Provider access ends at this date/time — stored on-chain as expiresAt"
            />
            <span className="mt-1 block text-xs font-normal text-slate-600">
              When this date passes, the provider can no longer run inference under this consent (unless you grant a new one).
            </span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {FIELD_CATEGORIES.map((f) => (
            <label
              key={f}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                scope.includes(f)
                  ? "border-teal-300 bg-teal-50/80 text-teal-800 ring-1 ring-teal-200"
                  : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={scope.includes(f)}
                onChange={(e) =>
                  setScope((s) => (e.target.checked ? [...s, f] : s.filter((x) => x !== f)))
                }
              />
              {f}
            </label>
          ))}
        </div>
        <Button className="mt-5" disabled={!isConnected || loading} onClick={grantConsent}>
          {loading ? "Granting…" : "Grant Consent"}
        </Button>
        {message && (
          <div className="mt-4">
            <Alert variant="success">{message}</Alert>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-teal-700 hover:underline"
          >
            {showTechnical ? "Hide technical details" : "Show technical details"}
          </button>
          {showTechnical && (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 font-mono text-[10px] text-slate-600"
              title={scopeHash}
            >
              <span className="font-sans font-semibold uppercase tracking-wide text-slate-600">Scope commitment</span>
              {scopeHash.slice(0, 10)}…{scopeHash.slice(-6)}
            </span>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Active Consents" />
        {consents.length === 0 ? (
          <EmptyState title="No consents yet" description="Grant consent to a provider to get started." />
        ) : (
          <ul className="mt-2 space-y-3">
            {consents.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 text-sm transition hover:border-teal-200/60"
              >
                <div className="min-w-0">
                  <div className="mono-block">{c.id}</div>
                  <p className="mt-2 text-slate-600">Provider: <span className="font-mono text-xs">{c.provider}</span></p>
                  <p className="text-slate-500">Expires: {new Date(c.expiresAt * 1000).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge ok={c.status === "Active"} label={c.status} />
                  {c.status === "Active" && (
                    <Button variant="secondary" size="sm" disabled={loading} onClick={() => revoke(c.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle title="Access Log" description="Every inference recorded against your data" />
        {accessLog.length === 0 ? (
          <EmptyState title="No access events" description="Inferences will appear here once a provider runs under your consent." />
        ) : (
          <ul className="mt-2 space-y-3">
            {accessLog.map((a) => (
              <li
                key={a.receiptId}
                className="rounded-xl border border-slate-200/70 bg-gradient-to-r from-white to-teal-50/30 p-4 transition hover:shadow-card"
              >
                <div className="mono-block">{a.receiptId}</div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>Provider: <span className="font-mono text-xs">{a.provider.slice(0, 12)}…</span></span>
                  <span className="font-semibold text-teal-700">Coherence {a.coherenceScore}</span>
                  <span>{new Date(a.timestamp * 1000).toLocaleString()}</span>
                </div>
                <a
                  href={`/verify?id=${a.receiptId}`}
                  className="mt-3 inline-flex items-center text-sm font-semibold text-teal-600 hover:text-teal-700"
                >
                  Verify receipt →
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
