'use client';

import { useState, useMemo } from 'react';
import type { PatientRecord } from '@/lib/types';
import { reconcileRecords } from '@/lib/ai/reconciliation';
import {
  AlertTriangle,
  FileText,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface ReconciliationPanelProps {
  record: PatientRecord;
  onUpdateMedicationStatus: (id: string, status: 'active' | 'stopped') => void;
}

export function ReconciliationPanel({
  record,
  onUpdateMedicationStatus,
}: ReconciliationPanelProps) {
  const { showToast } = useToast();
  const [resolvedIds, setResolvedIds] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'duplicate-ingredient' | 'outdated-medication' | 'lab-discordance'>('all');

  const rawFindings = useMemo(() => reconcileRecords(record, '2026-10-10'), [record]);

  const findings = useMemo(() => {
    if (categoryFilter === 'all') return rawFindings;
    return rawFindings.filter((f) => f.type === categoryFilter);
  }, [rawFindings, categoryFilter]);

  const handleResolveAction = (
    findingId: string,
    action: 'marked-stopped' | 'confirmed-both' | 'dismissed',
    targetMedId?: string,
    targetMedName?: string
  ) => {
    if (action === 'marked-stopped' && targetMedId) {
      onUpdateMedicationStatus(targetMedId, 'stopped');
      showToast(`Marked older prescription "${targetMedName}" as stopped`, 'success');
    } else if (action === 'confirmed-both') {
      showToast('Confirmed both active medications. Added note for consulting physician.', 'info');
    } else {
      showToast('Finding dismissed', 'info');
    }

    setResolvedIds((prev) => ({ ...prev, [findingId]: action }));
  };

  return (
    <div className="space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-xs font-bold text-[#14382f]">
              RECONCILIATION INTELLIGENCE
            </span>
            <span className="text-xs text-[#6e7771]">Cross-Prescriber &amp; Timeline Audit</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[#14382f]">
            Clinical Inconsistencies &amp; Lab Progression
          </h2>
          <p className="text-xs text-[#525d56] mt-0.5">
            Identify duplicate active ingredients across doctors, outdated therapies, and longitudinal lab trends.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              categoryFilter === 'all'
                ? 'bg-[#14382f] text-white shadow-2xs'
                : 'bg-white text-[#525d56] border border-[#d6ded5] hover:bg-[#f1f4ee]'
            }`}
          >
            All Findings ({rawFindings.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('duplicate-ingredient')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              categoryFilter === 'duplicate-ingredient'
                ? 'bg-[#14382f] text-white shadow-2xs'
                : 'bg-white text-[#525d56] border border-[#d6ded5] hover:bg-[#f1f4ee]'
            }`}
          >
            Duplicate Therapies
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('outdated-medication')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              categoryFilter === 'outdated-medication'
                ? 'bg-[#14382f] text-white shadow-2xs'
                : 'bg-white text-[#525d56] border border-[#d6ded5] hover:bg-[#f1f4ee]'
            }`}
          >
            Stale Meds
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('lab-discordance')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              categoryFilter === 'lab-discordance'
                ? 'bg-[#14382f] text-white shadow-2xs'
                : 'bg-white text-[#525d56] border border-[#d6ded5] hover:bg-[#f1f4ee]'
            }`}
          >
            Lab Trends
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {findings.map((finding) => {
          const resolution = resolvedIds[finding.id];
          const isResolved = Boolean(resolution);

          return (
            <div
              key={finding.id}
              className={`glass-panel rounded-2xl p-5 shadow-xs border transition-all ${
                isResolved
                  ? 'border-emerald-200 bg-emerald-50/40 opacity-75'
                  : finding.severity === 'high'
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-[#d6ded5] bg-white'
              }`}
            >
              {/* Finding Title & Badges */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                      isResolved
                        ? 'bg-emerald-100 text-emerald-800'
                        : finding.severity === 'high'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#ddf2e8] text-[#14382f]'
                    }`}
                  >
                    {isResolved ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#14382f]">{finding.title}</h3>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                          finding.severity === 'high'
                            ? 'bg-amber-200 text-amber-900'
                            : finding.severity === 'medium'
                            ? 'bg-orange-100 text-orange-900'
                            : 'bg-[#ddf2e8] text-[#14382f]'
                        }`}
                      >
                        {finding.severity} priority
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#525d56] leading-relaxed max-w-2xl">
                      {finding.explanation}
                    </p>
                  </div>
                </div>

                {isResolved && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Resolved ({resolution})
                  </span>
                )}
              </div>

              {/* Side-by-Side Compared Records */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {finding.records.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#e2e7e0] bg-[#f8f9f5] p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[#14382f]">
                      <span className="font-bold">{rec.label}</span>
                      {rec.date && <span className="text-[10px] text-[#6e7771]">{rec.date}</span>}
                    </div>
                    <p className="text-[#3b4c44] font-medium">{rec.value}</p>
                    <p className="text-[10px] text-[#6e7771] flex items-center gap-1 pt-1 border-t border-[#e2e7e0]">
                      <FileText className="h-3 w-3 text-[#2b8a7e]" />
                      <span>{rec.source}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Recommendation & Resolution Actions */}
              {!isResolved && (
                <div className="mt-4 pt-3 border-t border-[#e2e7e0] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#525d56] italic">
                    <strong className="text-[#14382f] not-italic">Suggested Action:</strong> {finding.suggestedResolution}
                  </p>

                  <div className="flex items-center gap-2">
                    {finding.type === 'duplicate-ingredient' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveAction(
                            finding.id,
                            'marked-stopped',
                            finding.records[0].id,
                            finding.records[0].label
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-xl bg-[#14382f] px-3 py-1.5 text-xs font-semibold text-[#ddf2e8] shadow-2xs hover:bg-[#1a473c] transition-all"
                      >
                        <Check className="h-3.5 w-3.5 text-[#3eb4a4]" />
                        <span>Mark Older Prescription Stopped</span>
                      </button>
                    )}

                    {finding.type === 'outdated-medication' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveAction(
                            finding.id,
                            'marked-stopped',
                            finding.records[0].id,
                            finding.records[0].label
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 transition-all"
                      >
                        <span>Mark Medication Stopped</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleResolveAction(finding.id, 'dismissed')}
                      className="rounded-xl border border-[#d6ded5] bg-white px-3 py-1.5 text-xs font-semibold text-[#6e7771] hover:bg-[#f1f4ee] hover:text-[#14382f] transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
