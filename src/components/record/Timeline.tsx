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
    return <p className="text-sm text-[#6e7771] italic py-2">No care events recorded.</p>;
  }

  // Sort reverse chronological
  const sorted = [...events].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="relative pl-7 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#d6ded5]">
      {sorted.map((e) => (
        <div key={e.id} className="relative group">
          {/* Circle indicator */}
          <div className="absolute -left-7 top-2 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#2b8a7e] shadow-2xs group-hover:scale-110 transition-transform" />

          <div className="rounded-xl border border-[#e2e7e0] bg-white p-4 shadow-2xs transition-all hover:border-[#b8c9bf] hover:shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#14382f]">{e.title}</span>
                <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#14382f]">
                  {e.type}
                </span>
              </div>

              {!readOnly && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#859088] hover:text-rose-700 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#525d56]">
              {e.date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#6e7771]" />
                  <span>{e.date}</span>
                </span>
              )}
              {e.facility && (
                <span className="inline-flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-[#6e7771]" />
                  <span>{e.facility}</span>
                </span>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#f1f4ee]">
              <SourceBadge provenance={e.provenance} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
