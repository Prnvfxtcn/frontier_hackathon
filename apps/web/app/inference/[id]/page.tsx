"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, Button, PageHeader, SectionTitle, Pill, EmptyState } from "@/components/ui";
import { VerifyIcon } from "@/components/icons";
import { ReceiptIdCard } from "@/components/receipt-id-card";
import { DocumentViewer } from "@/components/document-viewer";
import { CoherenceMeter, RigorBadges } from "@/components/coherence-meter";
import { EnsemblePanels } from "@/components/ensemble-panels";
import { DownloadCertificateButton } from "@/components/download-certificate-button";
import { extractDocument } from "@/lib/ai-client";
import { formatModelLabel } from "@/lib/model-labels";
import { modelLabelWithDigest } from "@/lib/model-digest";
import type { ExtractResponse } from "@/lib/types";

type Tab = "fields" | "fhir" | "ensemble";

export default function InferencePage({ params }: { params: { id: string } }) {
  const receiptId = params.id as `0x${string}`;
  const [extract, setExtract] = useState<ExtractResponse | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("fields");
  const [fhirBundle, setFhirBundle] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(`aegis-doc-${receiptId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setDocumentText(parsed.documentText ?? "");
      setExtract(parsed.extract ?? null);
      setTxHash(parsed.txHash ?? null);
      if (parsed.extract?.fhirBundle) setFhirBundle(parsed.extract.fhirBundle);
    }
  }, [receiptId]);

  useEffect(() => {
    if (!documentText || fhirBundle) return;
    extractDocument({
      documentText,
      schema: ["patientName", "dob", "diagnosis", "medications", "allergies", "followUp"],
      format: "fhir",
      ensemble: extract?.ensemble,
    })
      .then((res) => {
        if (res.fhirBundle) setFhirBundle(res.fhirBundle);
      })
      .catch(() => undefined);
  }, [documentText, fhirBundle, extract?.ensemble]);

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        eyebrow="Proof-of-Inference"
        title="Inference Receipt"
        description="Cryptographic provenance with grounding visualization and on-chain settlement."
        icon={<VerifyIcon className="h-7 w-7" />}
        badge={
          extract ? (
            <Pill variant={extract.admissible ? "success" : "warning"}>
              {extract.ensemble ? `Ensemble · ${extract.agreementScore ?? 0}% agree` : extract.admissible ? "Admissible" : "Not admissible"}
            </Pill>
          ) : undefined
        }
        actions={<DownloadCertificateButton receiptId={receiptId} extract={extract} txHash={txHash} />}
      />

      <ReceiptIdCard receiptId={receiptId} txHash={txHash} />

      {!extract ? (
        <Card>
          <EmptyState
            title="No local inference data"
            description="You can still verify this receipt on-chain using the Receipt ID above."
            action={
              <Link href={`/verify?id=${receiptId}`}>
                <Button>Verify on-chain →</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CoherenceMeter score={extract.coherenceScore} />
              <div className="mt-4">
                <RigorBadges rigors={extract.rigors} />
              </div>
            </Card>
            <Card>
              <SectionTitle title="On-Chain Hashes" />
              <div className="mt-3 space-y-2">
                <div>
                  <p className="field-label">inputHash</p>
                  <p className="mono-block mt-1">{extract.inputHash}</p>
                </div>
                <div>
                  <p className="field-label">outputHash (A)</p>
                  <p className="mono-block mt-1">{extract.outputHash}</p>
                </div>
                {extract.secondOutputHash && (
                  <div>
                    <p className="field-label">outputHash (B)</p>
                    <p className="mono-block mt-1">{extract.secondOutputHash}</p>
                  </div>
                )}
                <div>
                  <p className="field-label">model</p>
                  <p className="mt-1 font-semibold text-teal-700">
                    {formatModelLabel(extract.modelId, extract.mock)}
                  </p>
                  {extract.digestA && (
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500" title={extract.digestA}>
                      {modelLabelWithDigest(extract.modelId, extract.digestA)}
                    </p>
                  )}
                  {extract.secondModelId && (
                    <>
                      <p className="mt-2 font-semibold text-teal-700">
                        {formatModelLabel(extract.secondModelId, extract.mock)}
                      </p>
                      {extract.digestB && (
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500" title={extract.digestB}>
                          {modelLabelWithDigest(extract.secondModelId, extract.digestB)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <Badge ok={extract.admissible} label={extract.admissible ? "Admissible" : "Not admissible"} />
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-3">
              {(["fields", "ensemble", "fhir"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${
                    tab === t ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t === "fhir" ? "FHIR Bundle" : t}
                </button>
              ))}
            </div>

            {tab === "fields" && (
              <>
                <SectionTitle title="Document with Source Highlights" />
                <div className="mt-4">
                  <DocumentViewer text={documentText} fields={extract.fields} />
                </div>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {extract.fields.map((f) => (
                    <li
                      key={f.key}
                      className="rounded-xl border border-slate-200/60 bg-slate-50/50 px-4 py-3 text-sm"
                    >
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{f.key}</span>
                      <p className="mt-1 font-medium text-slate-800">{f.value ?? "null"}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tab === "ensemble" && (
              <div className="mt-4">
                {extract.ensemble ? (
                  <EnsemblePanels extract={extract} />
                ) : (
                  <EmptyState title="Single-model receipt" description="This receipt was minted without ensemble mode." />
                )}
              </div>
            )}

            {tab === "fhir" && (
              <div className="mt-4">
                {fhirBundle ? (
                  <>
                    <p className="mb-2 text-xs text-slate-500">
                      Valid FHIR R4 Bundle — plug into any FHIR-conformant EHR.
                    </p>
                    <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-100">
                      {JSON.stringify(fhirBundle, null, 2)}
                    </pre>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(fhirBundle, null, 2))}
                      >
                        Copy bundle
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(fhirBundle, null, 2)], {
                            type: "application/json",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `aegis-fhir-${receiptId.slice(0, 10)}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download .json
                      </Button>
                    </div>
                  </>
                ) : (
                  <EmptyState title="Loading FHIR bundle…" description="Bundle is generated from extracted fields." />
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
