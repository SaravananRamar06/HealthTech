// src/components/record/AllergyList.tsx - Allergy cards with status and source badges
// Owner: P1

import type { Allergy } from '@/lib/types';
import { SourceBadge } from './SourceBadge';

interface AllergyListProps {
  allergies: Allergy[];
  status?: 'unknown' | 'none-known' | 'has-allergies';
  onStatusChange?: (status: 'unknown' | 'none-known' | 'has-allergies') => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export function AllergyList({
  allergies,
  status = 'unknown',
  onStatusChange,
  onRemove,
  readOnly = false,
}: AllergyListProps) {
  return (
    <div className="space-y-3">
      {/* Allergy Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Allergy Status:
        </span>
        {readOnly ? (
          <span
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              status === 'has-allergies'
                ? 'bg-rose-100 text-rose-800'
                : status === 'none-known'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {status === 'has-allergies'
              ? 'Has known allergies'
              : status === 'none-known'
              ? 'No known allergies'
              : 'Unknown / Not recorded'}
          </span>
        ) : (
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => onStatusChange?.('has-allergies')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                status === 'has-allergies'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              Has Allergies
            </button>
            <button
              type="button"
              onClick={() => onStatusChange?.('none-known')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                status === 'none-known'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              No Known Allergies
            </button>
            <button
              type="button"
              onClick={() => onStatusChange?.('unknown')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                status === 'unknown'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              Unknown
            </button>
          </div>
        )}
      </div>

      {/* Allergies List */}
      {allergies && allergies.length > 0 ? (
        <div className="space-y-2">
          {allergies.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-rose-900">{a.substance}</span>
                  {a.reaction && (
                    <span className="text-xs text-rose-700 bg-rose-100/80 rounded px-1.5 py-0.5">
                      Reaction: {a.reaction}
                    </span>
                  )}
                </div>
                <div>
                  <SourceBadge provenance={a.provenance} />
                </div>
              </div>

              {!readOnly && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-white transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      ) : status === 'has-allergies' ? (
        <p className="text-xs text-amber-700 italic">
          Marked as having allergies, but no specific substances entered yet.
        </p>
      ) : null}
    </div>
  );
}