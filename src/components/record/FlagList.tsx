// src/components/record/FlagList.tsx - Visual safety & reconciliation flag display
// Owner: P1 / P4. Explainable rules, worded strictly as "for review".

import type { Flag } from '@/lib/types';

interface FlagListProps {
  flags: Flag[];
  title?: string;
}

export function FlagList({ flags, title = 'Reconciliation & Safety Flags' }: FlagListProps) {
  if (!flags || flags.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
        ✓ No active safety or reconciliation flags identified.
      </div>
    );
  }

  const reviewFlags = flags.filter((f) => f.severity === 'review');
  const infoFlags = flags.filter((f) => f.severity === 'info');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <span className="text-xs text-zinc-500 font-mono">
          {reviewFlags.length} for review · {infoFlags.length} info
        </span>
      </div>

      <div className="space-y-2">
        {/* Urgent / Review Flags */}
        {reviewFlags.map((flag, idx) => (
          <div
            key={`rev_${idx}`}
            className="rounded-lg border-l-4 border-amber-500 bg-amber-50/80 p-3 shadow-2xs border-t border-r border-b border-amber-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs text-amber-950">{flag.title}</span>
              <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                For Review
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">{flag.detail}</p>
          </div>
        ))}

        {/* Info Flags */}
        {infoFlags.map((flag, idx) => (
          <div
            key={`info_${idx}`}
            className="rounded-lg border-l-4 border-sky-400 bg-sky-50/80 p-3 shadow-2xs border-t border-r border-b border-sky-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs text-sky-950">{flag.title}</span>
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-800">
                Notice
              </span>
            </div>
            <p className="mt-1 text-xs text-sky-900/90 leading-relaxed">{flag.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
