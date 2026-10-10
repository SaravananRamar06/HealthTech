// src/components/record/FlagList.tsx - Visual safety & reconciliation flag display
// Owner: P1 / P4. Explainable rules, worded strictly as "for review".

import type { Flag } from '@/lib/types';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface FlagListProps {
  flags: Flag[];
  title?: string;
}

export function FlagList({ flags, title = 'Reconciliation & Safety Flags' }: FlagListProps) {
  if (!flags || flags.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-[var(--surface-muted)] p-3.5 text-[13px] text-[color:var(--brand-ink)]">
        <CheckCircle2 className="h-4 w-4 text-[color:var(--teal-text)] shrink-0" />
        <span>No active safety or reconciliation flags identified across active records.</span>
      </div>
    );
  }

  const reviewFlags = flags.filter((f) => f.severity === 'review');
  const infoFlags = flags.filter((f) => f.severity === 'info');

  return (
    <div className="space-y-3">
      <div className="section-bar flex items-center justify-between">
        <h3 className="text-sm font-bold text-[color:var(--brand-ink)] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>{title}</span>
        </h3>
        <span className="text-[12px] text-[color:var(--muted-grey)] font-mono">
          {reviewFlags.length} for review · {infoFlags.length} notices
        </span>
      </div>

      <div className="flag-grid">
        {/* Urgent / Review Flags */}
        {reviewFlags.map((flag, idx) => (
          <div
            key={`rev_${idx}`}
            className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-3.5 shadow-2xs border-l-4 border-l-amber-600 transition-colors hover:bg-amber-50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-[13px] text-amber-950 flex items-center gap-1.5">
                <span>{flag.title}</span>
              </span>
              <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider text-amber-900 shrink-0">
                For Review
              </span>
            </div>
            <p className="mt-1 text-[13px] text-amber-900/90 leading-relaxed">{flag.detail}</p>
          </div>
        ))}

        {/* Info Flags */}
        {infoFlags.map((flag, idx) => (
          <div
            key={`info_${idx}`}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-muted)] p-3.5 shadow-2xs border-l-4 border-l-[var(--teal-text)] transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-[13px] text-[color:var(--brand-ink)] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[color:var(--teal-text)] shrink-0" />
                <span>{flag.title}</span>
              </span>
              <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider text-[color:var(--brand-ink)] shrink-0">
                Notice
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[color:var(--brand-ink)] leading-relaxed">{flag.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
