"use client";

import { motion } from "framer-motion";

export function CoherenceMeter({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
      : score >= 60
        ? "bg-gradient-to-r from-amber-400 to-orange-500"
        : "bg-gradient-to-r from-rose-500 to-red-600";
  const label =
    score >= 80 ? "Admissible" : score >= 60 ? "Marginal" : "Below threshold";

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white p-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Coherence Score
          </span>
          <p className="mt-0.5 text-xs text-slate-400">{label} · threshold ≥ 80</p>
        </div>
        <motion.span
          key={score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-display text-4xl font-bold gradient-text"
        >
          {score}
        </motion.span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
        <motion.div
          className={`h-full rounded-full ${color} shadow-sm`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-y-0 left-[80%] w-px bg-slate-400/50" title="Threshold" />
      </div>
    </div>
  );
}

export function RigorBadges({ rigors }: { rigors: Record<string, boolean> }) {
  const labels = ["fidelity", "conservation", "austerity", "coherence"];
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((k) => (
        <span
          key={k}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ${
            rigors[k]
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 ring-rose-500/20"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${rigors[k] ? "bg-emerald-500" : "bg-rose-500"}`} />
          {k}
        </span>
      ))}
    </div>
  );
}
