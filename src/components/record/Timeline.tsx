// src/components/record/Timeline.tsx - Care events and encounters chronological timeline
// Owner: P1 / P4

import type { CareEvent } from '@/lib/types';
import { SourceBadge } from './SourceBadge';

interface TimelineProps {
  events: CareEvent[];
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export function Timeline({ events, onRemove, readOnly = false }: TimelineProps) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-zinc-500 italic">No care events recorded.</p>;
  }

  // Sort reverse chronological
  const sorted = [...events].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
      {sorted.map((e) => (
        <div key={e.id} className="relative group">
          {/* Circle indicator */}
          <div className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-500 shadow-xs" />

          <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-900">{e.title}</span>
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700">
                  {e.type}
                </span>
              </div>

              {!readOnly && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  className="text-zinc-400 hover:text-zinc-700 text-xs"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              {e.date && <span>Date: {e.date}</span>}
              {e.facility && <span>Facility: {e.facility}</span>}
            </div>

            <div className="mt-2">
              <SourceBadge provenance={e.provenance} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
