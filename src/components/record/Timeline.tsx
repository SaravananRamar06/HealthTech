// src/components/record/Timeline.tsx - Care events and encounters chronological timeline
// Owner: P1 / P4

import type { CareEvent } from '@/lib/types';
import { SourceBadge } from './SourceBadge';
import { Calendar, Building, XCircle } from 'lucide-react';

interface TimelineProps {
  events: CareEvent[];
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export function Timeline({ events, onRemove, readOnly = false }: TimelineProps) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-[color:var(--muted-grey)] italic py-2">No care events recorded.</p>;
  }

  // Sort reverse chronological
  const sorted = [...events].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="relative pl-7 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#cdd4c8]">
      {sorted.map((e) => (
        <div key={e.id} className="relative group">
          {/* Circle indicator */}
          <div className="absolute -left-7 top-2 h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--teal-action)] shadow-2xs group-hover:scale-110 transition-transform" />

          <div className="rounded-xl border border-[var(--border-card)] bg-white p-4 shadow-2xs transition-colors hover:border-[var(--border-strong)] hover:shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[color:var(--brand-ink)]">{e.title}</span>
                <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-[color:var(--brand-ink)]">
                  {e.type}
                </span>
              </div>

              {!readOnly && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  className="inline-flex items-center gap-1 text-[12px] text-[color:var(--muted-grey)] hover:text-rose-700 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[color:var(--muted-grey)]">
              {e.date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[color:var(--muted-grey)]" />
                  <span>{e.date}</span>
                </span>
              )}
              {e.facility && (
                <span className="inline-flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-[color:var(--muted-grey)]" />
                  <span>{e.facility}</span>
                </span>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#eeeee6]">
              <SourceBadge provenance={e.provenance} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
