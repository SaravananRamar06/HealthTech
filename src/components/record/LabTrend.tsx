// src/components/record/LabTrend.tsx - Lab results table with longitudinal trend visualization
// Owner: P1 / P4

import type { LabResult } from '@/lib/types';
import { SourceBadge } from './SourceBadge';

interface LabTrendProps {
  labs: LabResult[];
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export function LabTrend({ labs, onRemove, readOnly = false }: LabTrendProps) {
  if (!labs || labs.length === 0) {
    return <p className="text-sm text-zinc-500 italic">No lab results recorded.</p>;
  }

  // Group labs by test name
  const byTest = new Map<string, LabResult[]>();
  for (const lab of labs) {
    const list = byTest.get(lab.test) || [];
    list.push(lab);
    byTest.set(lab.test, list);
  }

  // Sort each group chronologically
  for (const list of byTest.values()) {
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  return (
    <div className="space-y-4">
      {Array.from(byTest.entries()).map(([testName, testLabs]) => {
        const latest = testLabs[testLabs.length - 1];
        const previous = testLabs.length > 1 ? testLabs[testLabs.length - 2] : null;
        const hasTrend = testLabs.length > 1;

        return (
          <div
            key={testName}
            className="rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-colors"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-100 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900">{testName}</span>
                {latest.refRange && (
                  <span className="text-xs text-zinc-400">Ref: {latest.refRange}</span>
                )}
              </div>

              {hasTrend && previous && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500">Trend:</span>
                  <span className="font-mono text-zinc-600">
                    {previous.value} ({previous.date})
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span
                    className={`font-mono font-semibold ${
                      latest.value < previous.value ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {latest.value} {latest.unit} ({latest.date})
                  </span>
                </div>
              )}
            </div>

            {/* Individual Entries */}
            <div className="space-y-2">
              {testLabs.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 bg-zinc-50/60 rounded p-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-medium text-zinc-900">
                      {l.value} {l.unit}
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span>{l.date}</span>
                    <SourceBadge provenance={l.provenance} />
                  </div>

                  {!readOnly && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(l.id)}
                      className="text-zinc-400 hover:text-zinc-700 text-[11px]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
