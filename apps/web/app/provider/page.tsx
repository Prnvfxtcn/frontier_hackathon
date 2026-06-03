"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { aegisPublicClient } from "@/lib/aegis-client";
import { decodeEventLog, maxUint256 } from "viem";
import { Card, Button, PageHeader, SectionTitle, Input, Select, Textarea, Alert, Pill, StatCard, EmptyState } from "@/components/ui";
import { ProviderIcon } from "@/components/icons";
import { DocumentViewer } from "@/components/document-viewer";
import { ReceiptIdCard } from "@/components/receipt-id-card";
import { CoherenceMeter, RigorBadges } from "@/components/coherence-meter";
import { checkAiHealth, extractDocument } from "@/lib/ai-client";
import {
  consentRegistryAbi,
  contractAddresses,
  inferenceRegistryAbi,
  mockUsdcAbi,
  settlementAbi,
} from "@/lib/contracts";
import { encryptDocument, hashText, storeCiphertext, DEFAULT_SCOPE_HASH } from "@/lib/crypto";
import { applyExtractHashes, applyModelVersions } from "@/lib/hashing";
import { withLocalGas } from "@/lib/tx";
import { waitForTx } from "@/lib/contracts-health";
import { buildMerkleRoot } from "@/lib/merkle";
import { formatModelLabel } from "@/lib/model-labels";
import { formatDigestBadge } from "@/lib/model-digest";
import { ClientOnly } from "@/components/client-only";
import { useMounted } from "@/hooks/use-mounted";
import { EnsemblePanels } from "@/components/ensemble-panels";
import {
  ENSEMBLE_REJECTION_BANNER,
  ensembleRejectionSubtitle,
  evaluateExtractForMint,
  getRunInferenceBlockReason,
  isEnsembleGateRejected,
  logEnsembleResponse,
  normalizeConsentId,
} from "@/lib/provider-inference";
import { FIELD_CATEGORIES, SAMPLE_DOCS, type ExtractResponse } from "@/lib/types";

type AiHealth = {
  status: string;
  model: string;
  modelA?: string;
  modelB?: string;
  modelAReady?: boolean;
  modelBReady?: boolean;
  modelADigest?: string;
  modelBDigest?: string;
  ollamaReachable?: boolean;
  mock?: boolean;
};

export default function ProviderPage() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const publicClient = aegisPublicClient;
  const { writeContractAsync } = useWriteContract();
  const router = useRouter();

  const [documentText, setDocumentText] = useState("");
  const [consentId, setConsentId] = useState("");
  const [consents, setConsents] = useState<{ id: string; provider: string; patient: string }[]>([]);
  const [consentLoadError, setConsentLoadError] = useState("");
  const [price, setPrice] = useState<bigint | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastReceipt, setLastReceipt] = useState<{ id: string; txHash: string } | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
  const [ensembleMode, setEnsembleMode] = useState(true);
  const [forceDisagree, setForceDisagree] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("aegis-last-receipt");
    if (saved) {
      try {
        setLastReceipt(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    checkAiHealth()
      .then(setAiHealth)
      .catch(() => setAiHealth({ status: "error", model: "unknown", mock: true }));
  }, []);

  useEffect(() => {
    async function load() {
      if (!publicClient) return;
      try {
        const p = await publicClient.readContract({
          address: contractAddresses.settlement,
          abi: settlementAbi,
          functionName: "price",
        });
        setPrice(p as bigint);
      } catch {}
      if (address) {
        try {
          const bal = await publicClient.readContract({
            address: contractAddresses.mockUsdc,
            abi: mockUsdcAbi,
            functionName: "balanceOf",
            args: [address],
          });
          setBalance(bal as bigint);
        } catch {}
      }
    }
    load();
  }, [publicClient, address]);

  useEffect(() => {
    async function loadConsents() {
      if (!publicClient || !address) return;
      setConsentLoadError("");
      try {
        const logs = await publicClient.getLogs({
          address: contractAddresses.consentRegistry,
          event: {
            type: "event",
            name: "ConsentGranted",
            inputs: [
              { name: "consentId", type: "bytes32", indexed: true },
              { name: "patient", type: "address", indexed: true },
              { name: "provider", type: "address", indexed: true },
              { name: "scopeHash", type: "bytes32", indexed: false },
              { name: "expiresAt", type: "uint64", indexed: false },
            ],
          },
          args: { provider: address },
          fromBlock: 0n,
        });
        const rows = logs.map((l) => ({
          id: l.args.consentId!,
          provider: l.args.provider!,
          patient: l.args.patient!,
        }));
        setConsents(rows);
        if (rows[0]?.id) setConsentId(rows[0].id);
        if (rows.length === 0) {
          setConsentLoadError(
            `No consents granted to ${address}. Switch MetaMask to the provider wallet, or re-grant on Patient using this address as provider.`
          );
        }
      } catch (e) {
        setConsentLoadError(e instanceof Error ? e.message : "Failed to load consents");
      }
    }
    loadConsents();
  }, [publicClient, address]);

  async function loadSample(path: string) {
    const res = await fetch(path);
    setDocumentText(await res.text());
    setResult(null);
    setMessage("");
  }

  function clearRejection() {
    setResult(null);
    setMessage("");
  }

  async function mintUsdc() {
    if (!address) return;
    try {
      const hash = await writeContractAsync(withLocalGas({
        address: contractAddresses.mockUsdc,
        abi: mockUsdcAbi,
        functionName: "mint",
        args: [address, 10_000_000n],
      }));
      await waitForTx(hash);
      setMessage("Minted 10 mUSDC");
      const bal = await publicClient.readContract({
        address: contractAddresses.mockUsdc,
        abi: mockUsdcAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setBalance(bal as bigint);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Mint failed");
    }
  }

  async function approveSettlement() {
    if (!address) return;
    try {
      const hash = await writeContractAsync(withLocalGas({
        address: contractAddresses.mockUsdc,
        abi: mockUsdcAbi,
        functionName: "approve",
        args: [contractAddresses.settlement, maxUint256],
      }));
      await waitForTx(hash);
      setMessage("Approved Settlement to spend mUSDC (unlimited for demo)");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Approve failed");
    }
  }

  async function ensureSettlementFunds() {
    if (!address || !price || !publicClient) return;
    let bal = (await publicClient.readContract({
      address: contractAddresses.mockUsdc,
      abi: mockUsdcAbi,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    if (bal < price) {
      const mintHash = await writeContractAsync(withLocalGas({
        address: contractAddresses.mockUsdc,
        abi: mockUsdcAbi,
        functionName: "mint",
        args: [address, 10_000_000n],
      }));
      await waitForTx(mintHash, "mUSDC faucet mint failed.");
      bal = (await publicClient.readContract({
        address: contractAddresses.mockUsdc,
        abi: mockUsdcAbi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      setBalance(bal);
    }

    const allowance = (await publicClient.readContract({
      address: contractAddresses.mockUsdc,
      abi: mockUsdcAbi,
      functionName: "allowance",
      args: [address, contractAddresses.settlement],
    })) as bigint;
    if (allowance < price) {
      const hash = await writeContractAsync(withLocalGas({
        address: contractAddresses.mockUsdc,
        abi: mockUsdcAbi,
        functionName: "approve",
        args: [contractAddresses.settlement, maxUint256],
      }));
      await waitForTx(hash, "Settlement approval failed.");
    }
  }

  async function runInference() {
    if (!address || !documentText || !consentId) {
      setMessage("Connect wallet, select document, and pick a consent.");
      return;
    }
    const normalizedConsent = normalizeConsentId(consentId);
    if (!normalizedConsent) {
      setMessage("Consent ID invalid — select a consent from the dropdown (do not paste extra text).");
      return;
    }
    if (normalizedConsent !== consentId) {
      setConsentId(normalizedConsent);
    }

    setLoading(true);
    setMessage("");
    setResult(null);
    let extractDone = false;
    try {
      const valid = await publicClient!.readContract({
        address: contractAddresses.consentRegistry,
        abi: consentRegistryAbi,
        functionName: "isConsentValid",
        args: [normalizedConsent, address, DEFAULT_SCOPE_HASH],
      });
      if (!valid) {
        throw new Error(
          "Consent invalid for this provider — re-grant on Patient after Anvil reset (patient 0x68d5…c560 → provider 0x1d42…2eab)."
        );
      }

      const rawExtract = await extractDocument({
        documentText,
        schema: [...FIELD_CATEGORIES],
        consentId: normalizedConsent,
        ensemble: ensembleMode,
        forceDisagree: ensembleMode && forceDisagree,
        format: "json",
      });
      const extract = applyModelVersions(applyExtractHashes(rawExtract, documentText));
      setResult(extract);
      extractDone = true;

      if (ensembleMode) {
        logEnsembleResponse(extract, forceDisagree);
      }

      const gate = evaluateExtractForMint(extract, forceDisagree);
      if (!gate.minted) {
        return;
      }

      const { ciphertext } = await encryptDocument(documentText);
      const docId = hashText(documentText);
      storeCiphertext(docId, ciphertext);

      const merkleRoot = buildMerkleRoot(extract.fields);

      await ensureSettlementFunds();

      const txHash = await writeContractAsync(withLocalGas({
        address: contractAddresses.inferenceRegistry,
        abi: inferenceRegistryAbi,
        functionName: "recordInference",
        args: [
          {
            consentId: normalizedConsent,
            provider: address,
            patientRef: "0x0000000000000000000000000000000000000000000000000000000000000000",
            inputHash: extract.inputHash as `0x${string}`,
            outputHash: extract.outputHash as `0x${string}`,
            promptHash: extract.promptHash as `0x${string}`,
            merkleRoot,
            modelId: extract.modelId,
            modelVersion: extract.modelVersion as `0x${string}`,
            coherenceScore: extract.coherenceScore,
            timestamp: 0n,
            paid: false,
            secondModelId: extract.secondModelId ?? "",
            secondModelVersion: (extract.secondModelVersion ?? `0x${"0".repeat(64)}`) as `0x${string}`,
            secondOutputHash: (extract.secondOutputHash ?? `0x${"0".repeat(64)}`) as `0x${string}`,
            agreementScore: extract.agreementScore ?? 0,
          },
        ],
      }));

      await waitForTx(
        txHash,
        "recordInference reverted — check mUSDC balance, consent validity, and ensemble agreement ≥ 80% on-chain."
      );

      const receipt = await publicClient!.getTransactionReceipt({ hash: txHash });

      let receiptId: `0x${string}` | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== contractAddresses.inferenceRegistry.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: inferenceRegistryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "InferenceRecorded") {
            receiptId = decoded.args.receiptId as `0x${string}`;
            break;
          }
        } catch {
          /* not our event */
        }
      }

      if (!receiptId) {
        throw new Error("Inference recorded but receipt ID not found in transaction logs.");
      }

      localStorage.setItem(
        `aegis-doc-${receiptId}`,
        JSON.stringify({ documentText, extract, txHash, consentId: normalizedConsent })
      );

      const receiptInfo = { id: receiptId, txHash };
      setLastReceipt(receiptInfo);
      sessionStorage.setItem("aegis-last-receipt", JSON.stringify(receiptInfo));

      setMessage(`Receipt minted successfully.`);
      router.push(`/inference/${receiptId}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Inference failed");
      if (!extractDone) setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const gateRejected = isEnsembleGateRejected(result);
  const showAdmissiblePreview = result && !gateRejected;
  const runBlockReason = mounted
    ? getRunInferenceBlockReason({
        address,
        documentText,
        consentId,
        loading,
      })
    : null;
  const runDisabled = !mounted || runBlockReason !== null;

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        eyebrow="Data Consumer"
        title="Provider Dashboard"
        description="Run local AI extraction under valid consent. Pay per inference. Receive on-chain receipts."
        icon={<ProviderIcon className="h-7 w-7" />}
        badge={
          <ClientOnly>
            {aiHealth ? (
              <div className="flex flex-wrap gap-2">
                <Pill variant={aiHealth.mock ? "warning" : "success"}>
                  Model A: {formatModelLabel(aiHealth.modelA ?? aiHealth.model, aiHealth.mock)}
                </Pill>
                {ensembleMode && (
                  <Pill variant={aiHealth.mock ? "warning" : "success"}>
                    Model B: {formatModelLabel(aiHealth.modelB ?? "qwen2.5:7b", aiHealth.mock)}
                  </Pill>
                )}
                {ensembleMode && !aiHealth.mock && (
                  <Pill variant="info">Ensemble ON — two models must agree</Pill>
                )}
                {ensembleMode && aiHealth.modelBReady === false && (
                  <Pill variant="warning">Pulling {aiHealth.modelB ?? "Model B"}…</Pill>
                )}
                {aiHealth.modelADigest && (
                  <Pill variant="info" title={aiHealth.modelADigest}>
                    A digest: {formatDigestBadge(aiHealth.modelADigest)}
                  </Pill>
                )}
                {ensembleMode && aiHealth.modelBDigest && (
                  <Pill variant="info" title={aiHealth.modelBDigest}>
                    B digest: {formatDigestBadge(aiHealth.modelBDigest)}
                  </Pill>
                )}
              </div>
            ) : null}
          </ClientOnly>
        }
      />

      <ClientOnly>
        {!isConnected && <Alert variant="info">Connect wallet on Base Sepolia to run inference.</Alert>}
      </ClientOnly>

      {lastReceipt && (
        <ReceiptIdCard receiptId={lastReceipt.id} txHash={lastReceipt.txHash} />
      )}

      <ClientOnly
        fallback={
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Inference Price" value="—" accent="teal" />
            <StatCard label="Your Balance" value="—" sub="Faucet available below" accent="cyan" />
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Inference Price" value={price ? `${Number(price) / 1e6} mUSDC` : "—"} accent="teal" />
          <StatCard
            label="Your Balance"
            value={address ? `${Number(balance) / 1e6} mUSDC` : "Connect wallet"}
            sub={address ? "Faucet available below" : undefined}
            accent="cyan"
          />
        </div>
      </ClientOnly>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Document" description="Load a sample or paste clinical text" />
          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_DOCS.map((s) => (
              <Button key={s.id} variant="secondary" size="sm" onClick={() => loadSample(s.path)}>
                {s.label}
              </Button>
            ))}
          </div>
          <Textarea
            className="mt-3 h-64"
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Paste clinical document text..."
          />
          <div className="mt-4 space-y-2">
            <Select
              value={normalizeConsentId(consentId) ?? ""}
              onChange={(e) => setConsentId(e.target.value)}
            >
              <option value="">Select consent granted to you</option>
              {consents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id.slice(0, 18)}… (patient {c.patient.slice(0, 8)}…)
                </option>
              ))}
            </Select>
            <Input
              className="font-mono text-xs"
              placeholder="Consent ID (auto-filled from dropdown — 0x + 64 hex chars)"
              value={consentId}
              onChange={(e) => setConsentId(e.target.value)}
              onBlur={() => {
                const normalized = normalizeConsentId(consentId);
                if (normalized) setConsentId(normalized);
              }}
            />
            {consentLoadError && <Alert variant="warning">{consentLoadError}</Alert>}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={ensembleMode}
                onChange={(e) => {
                  setEnsembleMode(e.target.checked);
                  if (!e.target.checked) setForceDisagree(false);
                }}
                className="h-4 w-4 rounded border-slate-300"
              />
              Ensemble verification (2 models)
            </label>
            {ensembleMode && (
              <label className="flex flex-wrap cursor-pointer items-center gap-2 text-sm font-semibold text-rose-700">
                <input
                  type="checkbox"
                  checked={forceDisagree}
                  onChange={(e) => setForceDisagree(e.target.checked)}
                  className="h-4 w-4 rounded border-rose-300"
                />
                Demo: force disagreement
                {forceDisagree && (
                  <Pill variant="warning">Force-disagree MODE — receipts will not mint.</Pill>
                )}
              </label>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={mintUsdc}>Faucet mUSDC</Button>
            <Button variant="secondary" size="sm" onClick={approveSettlement} disabled={!address}>
              Approve Settlement
            </Button>
            <Button
              disabled={runDisabled}
              title={runBlockReason ?? undefined}
              onClick={runInference}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Running…
                </span>
              ) : (
                "Run Inference"
              )}
            </Button>
          </div>
          {runBlockReason && !loading && (
            <p className="mt-2 text-xs font-medium text-amber-800">{runBlockReason}</p>
          )}
          {loading && (
            <p className="mt-2 text-xs text-slate-600">
              Running Llama 3.1 + Qwen 2.5 locally — first run can take up to 30s.
            </p>
          )}
          {message && (
            <div className="mt-3">
              <Alert
                variant={
                  message.includes("minted")
                    ? "success"
                    : message.includes("timed out") || message.includes("failed")
                      ? "error"
                      : "info"
                }
              >
                {message}
              </Alert>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title="Extraction Preview" />
          {gateRejected && result ? (
            <div className="mt-2 space-y-4">
              <div className="rounded-2xl border border-rose-300/80 bg-gradient-to-br from-rose-50 to-orange-50 px-5 py-4 text-rose-950 shadow-sm">
                <p className="font-display text-base font-bold">{ENSEMBLE_REJECTION_BANNER}</p>
                <p className="mt-1 text-sm text-rose-800/90">{ensembleRejectionSubtitle(result)}</p>
              </div>
              {result.models && result.models.length >= 2 && (
                <EnsemblePanels extract={result} highlightDisagreements showGateCaption />
              )}
              <div className="flex justify-center pt-1">
                <Button variant="secondary" size="sm" onClick={clearRejection}>
                  Try again
                </Button>
              </div>
            </div>
          ) : !showAdmissiblePreview ? (
            loading ? (
              <div className="mt-4 flex flex-col items-center gap-3 py-10 text-center text-sm text-slate-700">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600" />
                <p>Running Llama 3.1 + Qwen 2.5 locally…</p>
                <p className="text-xs">First run can take up to 30s.</p>
              </div>
            ) : (
              <EmptyState title="No extraction yet" description="Run inference to see fields, coherence, and rigors." />
            )
          ) : (
            <div className="mt-2 space-y-4">
              {result!.ensemble && result!.models && result!.models.length >= 2 ? (
                <EnsemblePanels extract={result!} />
              ) : (
                <>
                  {result!.ensemble && result!.agreement && (
                    <Pill variant={result!.admissible ? "success" : "warning"}>
                      Agreement: {result!.agreement.overall}%
                    </Pill>
                  )}
                  <CoherenceMeter score={result!.coherenceScore} />
                  <RigorBadges rigors={result!.rigors} />
                  <ul className="space-y-2">
                    {result!.fields.map((f) => (
                      <li
                        key={f.key}
                        className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/50 px-4 py-3 text-sm"
                      >
                        <span>
                          <span className="font-semibold text-slate-800">{f.key}:</span>{" "}
                          <span className="text-slate-600">{f.value ?? "null"}</span>
                        </span>
                        <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-700">
                          {Math.round(f.grounding * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {documentText && showAdmissiblePreview && (
        <Card glow={result!.admissible}>
          <SectionTitle title="Source Span Highlights" description="Grounded fields highlighted in the document" />
          <div className="mt-4">
            <DocumentViewer text={documentText} fields={result!.fields} />
          </div>
        </Card>
      )}
    </div>
  );
}
