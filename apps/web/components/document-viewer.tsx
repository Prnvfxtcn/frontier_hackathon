"use client";

import type { ExtractField } from "@/lib/types";

const fieldColors: Record<string, string> = {
  patientName: "bg-violet-300 text-violet-950 ring-violet-400",
  dob: "bg-blue-300 text-blue-950 ring-blue-400",
  diagnosis: "bg-rose-300 text-rose-950 ring-rose-400",
  medications: "bg-emerald-300 text-emerald-950 ring-emerald-400",
  allergies: "bg-amber-300 text-amber-950 ring-amber-400",
  followUp: "bg-cyan-300 text-cyan-950 ring-cyan-400",
};

export function DocumentViewer({
  text,
  fields,
  activeKey,
}: {
  text: string;
  fields?: ExtractField[];
  activeKey?: string;
}) {
  const highlights = fields?.filter((f) => f.value && f.sourceSpan.end > f.sourceSpan.start) ?? [];
  const segments: { start: number; end: number; key?: string }[] = [];
  const sorted = [...highlights].sort((a, b) => a.sourceSpan.start - b.sourceSpan.start);

  let cursor = 0;
  for (const f of sorted) {
    if (f.sourceSpan.start > cursor) segments.push({ start: cursor, end: f.sourceSpan.start });
    segments.push({ start: f.sourceSpan.start, end: f.sourceSpan.end, key: f.key });
    cursor = Math.max(cursor, f.sourceSpan.end);
  }
  if (cursor < text.length) segments.push({ start: cursor, end: text.length });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-950 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 border-b border-slate-700/50 bg-slate-900 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        <span className="ml-2 text-xs font-medium text-slate-300">Clinical Document · Source Spans</span>
      </div>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap p-5 font-mono text-sm leading-relaxed text-slate-100">
        {segments.map((seg, i) => {
          const chunk = text.slice(seg.start, seg.end);
          if (!seg.key) return <span key={i}>{chunk}</span>;
          const active = seg.key === activeKey;
          const colorClass = fieldColors[seg.key] ?? "bg-sky-300 text-sky-950 ring-sky-400";
          return (
            <mark
              key={i}
              className={`rounded px-1 py-0.5 ring-1 ${colorClass} ${active ? "ring-2 ring-yellow-400" : ""}`}
              title={seg.key}
            >
              {chunk}
            </mark>
          );
        })}
      </pre>
      {fields && fields.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-700/50 bg-slate-900/80 px-4 py-3">
          {fields.filter((f) => f.value).map((f) => (
            <span
              key={f.key}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${fieldColors[f.key] ?? "bg-slate-700 text-slate-200"}`}
            >
              {f.key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
