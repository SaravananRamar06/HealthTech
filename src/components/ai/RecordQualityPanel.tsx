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
            <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-xs font-bold text-[#14382f]">
              DATA QUALITY &amp; AUDIT
            </span>
            <span className="text-xs text-[#6e7771]">Deterministic Verification</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[#14382f]">
            Record Completeness &amp; Data Hygiene
          </h2>
          <p className="text-xs text-[#525d56] mt-0.5">
            Identifies missing dates, incomplete instructions, unreviewed extractions, and items needing human review.
          </p>
        </div>

        {/* Quality Status Pill */}
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-[#d6ded5] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#14382f] shadow-2xs">
            <span>{activeIssues.length} Actionable Items</span>
            {resolvedCount > 0 && (
              <span className="ml-2 text-emerald-700">({resolvedCount} resolved)</span>
            )}
          </div>
        </div>
      </div>

      {/* Issues List */}
      {activeIssues.length === 0 ? (
        <div className="glass-panel rounded-2xl bg-white p-8 text-center border border-[#d6ded5] space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ddf2e8] text-[#14382f]">
            <CheckCircle2 className="h-6 w-6 text-[#2b8a7e]" />
          </div>
          <h3 className="text-sm font-bold text-[#14382f]">All Record Quality Items Reviewed</h3>
          <p className="text-xs text-[#525d56] max-w-md mx-auto">
            Your health records have no pending unreviewed document extractions, missing measurement units, or unverified prescriptions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeIssues.map((issue) => (
            <div
              key={issue.id}
              className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-2xs border border-[#d6ded5] hover:border-[#2b8a7e] transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    issue.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#ddf2e8] text-[#14382f]'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#14382f]">{issue.title}</span>
                    <span className="rounded bg-[#f1f4ee] px-1.5 py-0.5 text-[9px] font-semibold text-[#525d56] uppercase">
                      {issue.category.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#525d56] leading-relaxed max-w-xl">
                    {issue.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResolve(issue.id, issue.title)}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#14382f] px-3 py-1.5 text-xs font-semibold text-[#ddf2e8] shadow-2xs hover:bg-[#1a473c] transition-all"
                >
                  <Check className="h-3.5 w-3.5 text-[#3eb4a4]" />
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
