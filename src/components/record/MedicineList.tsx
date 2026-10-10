// src/components/record/MedicineList.tsx - Medicines with ingredients and source labels
// Owner: P1. Uses Medication type; the name field is brand as written; ingredients are generic names as printed.

import type { Medication } from '@/lib/types';
import { SourceBadge } from './SourceBadge';
import { Pill, XCircle, StopCircle } from 'lucide-react';

interface MedicineListProps {
  medications: Medication[];
  onStop?: (id: string) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export function MedicineList({ medications, onStop, onRemove, readOnly = false }: MedicineListProps) {
  if (!medications || medications.length === 0) {
    return <p className="text-sm text-[color:var(--muted-grey)] italic py-2">No medications recorded.</p>;
  }

  const activeMeds = medications.filter((m) => m.status === 'active');
  const stoppedMeds = medications.filter((m) => m.status === 'stopped');

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {activeMeds.map((m) => (
          <div
            key={m.id}
            className="record-row flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-[var(--border-card)] bg-white p-4 shadow-2xs transition-colors hover:border-[var(--border-strong)] hover:shadow-xs"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--mint-100)] text-[color:var(--brand-ink)]">
                  <Pill className="h-3.5 w-3.5 text-[color:var(--teal-text)]" />
                </div>
                <span className="font-bold text-sm text-[color:var(--brand-ink)]">{m.name}</span>
                {m.ingredients && m.ingredients.length > 0 && (
                  <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[13px] font-mono text-[color:var(--brand-ink)] border border-[var(--border-card)]">
                    {m.ingredients.join(' + ')}
                  </span>
                )}
                {m.strength && (
                  <span className="text-[13px] font-medium text-[color:var(--muted-grey)]">({m.strength})</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[color:var(--muted-grey)] pl-8">
                {m.dosage && <span>Dose: <strong className="text-[color:var(--brand-ink)]">{m.dosage}</strong></span>}
                {m.prescriber && <span>By: {m.prescriber}</span>}
                {m.prescribedOn && <span>Date: {m.prescribedOn}</span>}
              </div>

              <div className="pt-1 pl-8">
                <SourceBadge provenance={m.provenance} />
              </div>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                {onStop && (
                  <button
                    type="button"
                    onClick={() => onStop(m.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[13px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                  >
                    <StopCircle className="h-3 w-3" />
                    <span>Mark stopped</span>
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(m.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-card)] px-2 py-1 text-[13px] text-[color:var(--muted-grey)] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                  >
                    <XCircle className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {stoppedMeds.length > 0 && (
        <div className="pt-3 border-t border-[var(--border-card)]">
          <h4 className="text-[13px] font-bold uppercase tracking-wider text-[color:var(--muted-grey)] mb-2">
            Discontinued / Stopped Regimens
          </h4>
          <div className="space-y-2 opacity-80">
            {stoppedMeds.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border-card)] bg-[var(--background)] p-2.5 text-[13px] text-[color:var(--muted-grey)]"
              >
                <div className="flex items-center gap-2">
                  <span className="line-through font-semibold text-[color:var(--muted-grey)]">{m.name}</span>
                  {m.ingredients && ` (${m.ingredients.join(', ')})`}
                  <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[color:var(--brand-ink)] text-[12px] font-bold">Stopped</span>
                </div>
                <SourceBadge provenance={m.provenance} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
