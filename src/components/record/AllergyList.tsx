// src/components/record/AllergyList.tsx - Allergy cards with status and source badges
// Owner: P1

import type { Allergy } from '@/lib/types';
import { SourceBadge } from './SourceBadge';
import { ShieldAlert, AlertTriangle, CheckCircle, HelpCircle, XCircle } from 'lucide-react';

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
    <div className="space-y-3.5">
      {/* Allergy Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#e2e7e0] bg-[#f8f9f5] p-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#525d56] flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-[#2b8a7e]" />
          <span>Allergy Status:</span>
        </span>
        {readOnly ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ${
              status === 'has-allergies'
                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                : status === 'none-known'
                ? 'bg-[#ddf2e8] text-[#14382f] border border-[#b8decb]'
                : 'bg-amber-100 text-amber-900 border border-amber-200'
            }`}
          >
            {status === 'has-allergies' && <AlertTriangle className="h-3.5 w-3.5 text-rose-700" />}
            {status === 'none-known' && <CheckCircle className="h-3.5 w-3.5 text-[#2b8a7e]" />}
            {status === 'unknown' && <HelpCircle className="h-3.5 w-3.5 text-amber-700" />}
            <span>
              {status === 'has-allergies'
                ? 'Has known allergies'
                : status === 'none-known'
                ? 'No known allergies'
                : 'Unknown / Not recorded'}
            </span>
          </span>
        ) : (
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => onStatusChange?.('has-allergies')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all shadow-2xs ${
                status === 'has-allergies'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-zinc-700 border border-[#d6ded5] hover:bg-[#f1f4ee]'
              }`}
            >
              Has Allergies
            </button>
            <button
              type="button"
              onClick={() => onStatusChange?.('none-known')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all shadow-2xs ${
                status === 'none-known'
                  ? 'bg-[#14382f] text-[#ddf2e8] shadow-xs'
                  : 'bg-white text-zinc-700 border border-[#d6ded5] hover:bg-[#f1f4ee]'
              }`}
            >
              No Known Allergies
            </button>
            <button
              type="button"
              onClick={() => onStatusChange?.('unknown')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all shadow-2xs ${
                status === 'unknown'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-zinc-700 border border-[#d6ded5] hover:bg-[#f1f4ee]'
              }`}
            >
              Unknown
            </button>
          </div>
        )}
      </div>

      {/* Allergies List */}
      {allergies && allergies.length > 0 ? (
        <div className="space-y-2.5">
          {allergies.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-rose-200/80 bg-rose-50/60 p-3.5 shadow-2xs transition-colors hover:bg-rose-50"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-rose-950">{a.substance}</span>
                  {a.reaction && (
                    <span className="rounded-md border border-rose-200 bg-rose-100/80 px-2 py-0.5 text-xs font-medium text-rose-900">
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
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : status === 'has-allergies' ? (
        <p className="text-xs text-amber-800 italic bg-amber-50/70 p-3 rounded-xl border border-amber-200">
          Marked as having allergies, but no specific substances entered yet.
        </p>
      ) : null}
    </div>
  );
}