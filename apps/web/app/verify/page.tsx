"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Button, Badge, PageHeader, SectionTitle, Input, Textarea, VerdictBanner, Pill } from "@/components/ui";
import { VerifyIcon } from "@/components/icons";
import { extractDocument } from "@/lib/ai-client";
import { verifyReceipt } from "@/lib/verify";
import { hashDocument } from "@/lib/hashing";
import { DEMO_RECEIPT_ID } from "@/lib/public-provenance";
import { OnChainProof } from "@/components/on-chain-proof";
import { DownloadCertificateButton } from "@/components/download-certificate-button";
import type { VerifyResult } from "@/lib/types";
import type { ExtractResponse } from "@/lib/types";

function cachedExtract(receiptId: string): ExtractResponse | undefined {
  try {
    const raw = localStorage.getItem(`aegis-doc-${receiptId}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { extract?: ExtractResponse };
    return parsed.extract;
  } catch {
    return undefined;
  }
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const [receiptId, setReceiptId] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [originalDocument, setOriginalDocument] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [lastExtract, setLastExtract] = useState<ExtractResponse | undefined>();
  const [loading, setLoading] = useState(false);

  const runVerify = useCallback(
    async (docOverride?: string, opts?: { onChainOnly?: boolean }) => {
      const id = receiptId.trim();
      if (!id) return;
      setLoading(true);
      try {
        const doc = docOverride ?? documentText;
        const stored = cachedExtract(id);
        let extract: ExtractResponse | undefined = stored;
        if (!opts?.onChainOnly && doc.trim() && !extract) {
          try {
            extract = await extractDocument({
              documentText: doc,
              schema: ["patientName", "dob", "diagnosis", "medications", "allergies", "followUp"],
              ensemble: Boolean(stored?.ensemble),
            });
          } catch {
            /* AI optional — on-chain + input hash still work without local extractor */
          }
        }
        const res = await verifyReceipt({
          receiptId: id as `0x${string}`,
          documentText: opts?.onChainOnly ? undefined : doc,
          extract,
        });
        setLastExtract(extract);
        setResult(res);
      } catch (e) {
        setResult({
          checks: [{ label: "Verification error", ok: false, detail: e instanceof Error ? e.message : "failed" }],
          verdict: "fail",
        });
      } finally {
        setLoading(false);
      }
    },
    [receiptId, documentText]
  );

  useEffect(() => {
    const id = searchParams.get("id") ?? searchParams.get("receipt") ?? "";
    if (!id) return;

    setReceiptId(id);

    let doc = "";
    const cached = localStorage.getItem(`aegis-doc-${id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.documentText) {
          doc = parsed.documentText;
          setDocumentText(doc);
          setOriginalDocument(doc);
        }
      } catch {
        /* ignore */
      }
    }

    if (!id.startsWith("0x")) return;

    (async () => {
      setLoading(true);
      try {
        const stored = cachedExtract(id);
        let extract: ExtractResponse | undefined = stored;
        if (doc.trim() && !extract) {
          try {
            extract = await extractDocument({
              documentText: doc,
              schema: ["patientName", "dob", "diagnosis", "medications", "allergies", "followUp"],
              ensemble: Boolean(stored?.ensemble),
            });
          } catch {
            /* continue with on-chain checks */
          }
        }
        const res = await verifyReceipt({
          receiptId: id as `0x${string}`,
          documentText: doc || undefined,
          extract,
        });
        setLastExtract(extract);
        setResult(res);
      } catch (e) {
        setResult({
          checks: [{ label: "Verification error", ok: false, detail: e instanceof Error ? e.message : "failed" }],
          verdict: "fail",
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function tamperWord() {
    const words = documentText.split(/\s+/);
    if (words.length < 2) {
      setDocumentText(documentText + " tampered");
      void runVerify(documentText + " tampered");
      return;
    }
    const idx = Math.min(3, words.length - 1);
    words[idx] = words[idx] + "X";
    const tampered = words.join(" ");
    setDocumentText(tampered);
    void runVerify(tampered);
  }

  function resetDocument() {
    setDocumentText(originalDocument);
    void runVerify(originalDocument);
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        eyebrow="Public Auditor"
        title="Verify Receipt"
        description="Independently verify any proof-of-inference receipt — no wallet required."
        icon={<VerifyIcon className="h-7 w-7" />}
        badge={<Pill variant="info">No wallet · public RPC reads</Pill>}
      />

      {DEMO_RECEIPT_ID && (
        <Card className="border-teal-200/60 bg-teal-50/40">
          <p className="text-sm text-teal-900">
            <strong>Judge demo:</strong> verify our seeded receipt{" "}
            <button
              type="button"
              className="font-mono underline"
              onClick={() => {
                setReceiptId(DEMO_RECEIPT_ID!);
                void runVerify("", { onChainOnly: true });
              }}
            >
              {DEMO_RECEIPT_ID.slice(0, 10)}…
            </button>
          </p>
        </Card>
      )}

      <Card>
        <SectionTitle title="Verification Input" description="Use the Receipt ID — not the transaction hash" />
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-semibold text-slate-700">
            Receipt ID
            <Input
              className="mt-1.5 font-mono"
              placeholder="0x…"
              value={receiptId}
              onChange={(e) => setReceiptId(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Source document
            <Textarea
              className="mt-1.5 h-44"
              placeholder="Paste the original clinical document to verify input hash"
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={loading} onClick={() => runVerify()}>
              {loading ? "Verifying…" : "Verify full"}
            </Button>
            <Button variant="secondary" disabled={loading || !receiptId.trim()} onClick={() => runVerify("", { onChainOnly: true })}>
              Verify on-chain only
            </Button>
            <Button variant="secondary" disabled={loading || !documentText} onClick={() => runVerify(documentText)}>
              Re-verify with edited document
            </Button>
            <Button variant="danger" size="sm" disabled={!documentText} onClick={tamperWord}>
              Demo: tamper a word
            </Button>
            {originalDocument && documentText !== originalDocument && (
              <Button variant="ghost" size="sm" onClick={resetDocument}>
                Reset to original
              </Button>
            )}
          </div>
          {documentText && receiptId && (
            <p className="mono-block">Client inputHash: {hashDocument(documentText)}</p>
          )}
        </div>
      </Card>

      {receiptId.trim().startsWith("0x") && <OnChainProof receiptId={receiptId.trim()} />}

      {result && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <VerdictBanner verdict={result.verdict} />
            {result.verdict === "pass" && receiptId.trim().startsWith("0x") && (
              <DownloadCertificateButton receiptId={receiptId.trim()} extract={lastExtract} size="sm" />
            )}
          </div>
          <ul className="mt-6 space-y-2">
            {result.checks.map((c, i) => (
              <li
                key={i}
                className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-sm transition ${
                  c.ok
                    ? "border-emerald-200/60 bg-emerald-50/30"
                    : "border-rose-200/60 bg-rose-50/30"
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-800">{c.label}</div>
                  {c.detail && <div className="mt-1 font-mono text-xs text-slate-700 break-all">{c.detail}</div>}
                </div>
                <Badge ok={c.ok} label={c.ok ? "pass" : "fail"} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Card>Loading verify…</Card>}>
      <VerifyContent />
    </Suspense>
  );
}
