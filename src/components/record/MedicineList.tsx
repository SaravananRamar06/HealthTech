// src/components/record/MedicineList.tsx - Medicines with ingredients and source labels
// Owner: P1. Uses Medication type; the name field is brand as written; ingredients are generic names as printed.

import type { Medication } from '@/lib/types';
import { SourceBadge } from './SourceBadge';

interface MedicineListProps {
  medications: Medication[];
  onStop?: (id: string) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export function MedicineList({ medications, onStop, onRemove, readOnly = false }: MedicineListProps) {
  if (!medications || medications.length === 0) {
    return <p className="text-sm text-zinc-500 italic">No medications recorded.</p>;
  }

  const activeMeds = medications.filter((m) => m.status === 'active');
  const stoppedMeds = medications.filter((m) => m.status === 'stopped');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {activeMeds.map((m) => (
          <div
            key={m.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-colors hover:border-zinc-300"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-900">{m.name}</span>
                {m.ingredients && m.ingredients.length > 0 && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-700">
                    {m.ingredients.join(' + ')}
                  </span>
                )}
                {m.strength && (
                  <span className="text-xs text-zinc-500">({m.strength})</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
                {m.dosage && <span>Dose: <strong>{m.dosage}</strong></span>}
                {m.prescriber && <span>By: {m.prescriber}</span>}
                {m.prescribedOn && <span>Prescribed: {m.prescribedOn}</span>}
              </div>

              <div className="pt-0.5">
                <SourceBadge provenance={m.provenance} />
              </div>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {onStop && (
                  <button
                    type="button"
                    onClick={() => onStop(m.id)}
                    className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    Mark stopped
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(m.id)}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {stoppedMeds.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Discontinued / Stopped Medicines
          </h4>
          <div className="space-y-2 opacity-75">
            {stoppedMeds.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-600"
              >
                <div>
                  <span className="line-through font-medium text-zinc-700">{m.name}</span>
                  {m.ingredients && ` (${m.ingredients.join(', ')})`}
                  <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-zinc-600 text-[10px]">Stopped</span>
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