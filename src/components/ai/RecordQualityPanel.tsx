'use client';

import { useState, useMemo } from 'react';
import type { PatientRecord } from '@/lib/types';
import { auditRecordQuality } from '@/lib/ai/recordQuality';
import {
  CheckCircle2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface RecordQualityPanelProps {
  record: PatientRecord;
}

export function RecordQualityPanel({ record }: RecordQualityPanelProps) {
  const { showToast } = useToast();
  const [resolvedIds, setResolvedIds] = useState<Record<string, boolean>>({});

  const issues = useMemo(() => auditRecordQuality(record), [record]);

  const activeIssues = issues.filter((i) => !resolvedIds[i.id]);
  const resolvedCount = Object.keys(resolvedIds).length;

  const handleResolve = (id: string, title: string) => {
    setResolvedIds((prev) => ({ ...prev, [id]: true }));
    showToast(`Marked "${title}" as reviewed`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[13px] font-bold text-[color:var(--brand-ink)]">
              DATA QUALITY &amp; AUDIT
            </span>
            <span className="text-[13px] text-[color:var(--muted-grey)]">Deterministic Verification</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[color:var(--brand-ink)]">
            Record Completeness &amp; Data Hygiene
          </h2>
          <p className="text-[13px] text-[color:var(--muted-grey)] mt-0.5">
            Identifies missing dates, incomplete instructions, unreviewed extractions, and items needing human review.
          </p>
        </div>

        {/* Quality Status Pill */}
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[color:var(--brand-ink)] shadow-2xs">
            <span>{activeIssues.length} Actionable Items</span>
            {resolvedCount > 0 && (
              <span className="ml-2 text-emerald-700">({resolvedCount} resolved)</span>
            )}
          </div>
        </div>
      </div>

      {/* Issues List */}
      {activeIssues.length === 0 ? (
        <div className="glass-panel rounded-2xl bg-white p-8 text-center border border-[var(--border-card)] space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-[color:var(--brand-ink)]">
            <CheckCircle2 className="h-6 w-6 text-[color:var(--teal-text)]" />
          </div>
          <h3 className="text-sm font-bold text-[color:var(--brand-ink)]">All Record Quality Items Reviewed</h3>
          <p className="text-[13px] text-[color:var(--muted-grey)] max-w-md mx-auto">
            Your health records have no pending unreviewed document extractions, missing measurement units, or unverified prescriptions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeIssues.map((issue) => (
            <div
              key={issue.id}
              className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-2xs border border-[var(--border-card)] hover:border-[var(--teal-text)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    issue.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[var(--mint-100)] text-[color:var(--brand-ink)]'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[color:var(--brand-ink)]">{issue.title}</span>
                    <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--muted-grey)] uppercase">
                      {issue.category.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-[color:var(--muted-grey)] leading-relaxed max-w-xl">
                    {issue.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResolve(issue.id, issue.title)}
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--forest-800)] px-3 py-1.5 text-[13px] font-semibold text-[#e4eee5] shadow-2xs hover:bg-[var(--forest-700)] transition-colors"
                >
                  <Check className="h-3.5 w-3.5 text-[#8ccab5]" />
                  <span>Mark Reviewed</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
