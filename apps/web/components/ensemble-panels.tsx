"use client";

import { Pill } from "@/components/ui";
import { formatModelLabel } from "@/lib/model-labels";
import { formatDigestBadge } from "@/lib/model-digest";
import { AGREEMENT_THRESHOLD } from "@/lib/provider-inference";
import type { ExtractResponse } from "@/lib/types";

export function agreementBadge(score: number) {
  if (score >= 0.95) return { label: "✓ match", variant: "success" as const };
  if (score >= 0.6) return { label: "~ similar", variant: "info" as const };
  return { label: "✗ disagree", variant: "warning" as const };
}

export function EnsemblePanels({
  extract,
  highlightDisagreements = false,
  showGateCaption = false,
}: {
  extract: ExtractResponse;
  highlightDisagreements?: boolean;
  showGateCaption?: boolean;
}) {
  if (!extract.ensemble || !extract.models || extract.models.length < 2) return null;

  const [modelA, modelB] = extract.models;
  const perField = extract.agreement?.perField ?? {};
  const overall = extract.agreement?.overall ?? extract.agreementScore ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Pill variant={extract.admissible ? "success" : "warning"}>
          Agreement: {overall}%
        </Pill>
        <Pill variant="info">{formatModelLabel(modelA.modelId, extract.mock)}</Pill>
        <Pill variant="info">{formatModelLabel(modelB.modelId, extract.mock)}</Pill>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[modelA, modelB].map((model, idx) => (
          <div key={model.modelId} className="rounded-2xl border border-slate-200/60 bg-white p-4">
            <h3 className="font-display text-sm font-bold text-slate-800">
              Model {idx === 0 ? "A" : "B"} — {formatModelLabel(model.modelId, extract.mock)}
            </h3>
            {(idx === 0 ? extract.digestA ?? model.modelDigest : extract.digestB ?? model.modelDigest) && (
              <p
                className="mt-1 font-mono text-[10px] text-slate-500"
                title={idx === 0 ? extract.digestA ?? model.modelDigest : extract.digestB ?? model.modelDigest}
              >
                {formatDigestBadge(
                  idx === 0 ? extract.digestA ?? model.modelDigest : extract.digestB ?? model.modelDigest
                )}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">Coherence {model.coherenceScore}</p>
            <ul className="mt-3 space-y-2">
              {model.fields.map((f) => {
                const ag = perField[f.key] ?? 0;
                const badge = agreementBadge(ag);
                const disagrees = highlightDisagreements && ag < 0.6;
                return (
                  <li
                    key={f.key}
                    className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                      disagrees
                        ? "border border-rose-300/70 bg-rose-50 text-rose-950"
                        : "bg-slate-50"
                    }`}
                  >
                    <span>
                      <span className="font-semibold">{f.key}:</span> {f.value ?? "null"}
                    </span>
                    {idx === 0 && (
                      <Pill variant={disagrees ? "warning" : badge.variant}>
                        {disagrees ? "✗ disagree" : badge.label}
                      </Pill>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mono-block mt-3 text-[10px]">{model.outputHash}</p>
          </div>
        ))}
      </div>
      {showGateCaption && (
        <p className="text-center text-xs text-slate-500">
          Gate threshold: agreement ≥ {AGREEMENT_THRESHOLD}% — current {overall}%.
        </p>
      )}
    </div>
  );
}
