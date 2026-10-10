import type { Condition } from '@/lib/types';
import { SourceBadge } from './SourceBadge';
import { HeartPulse, XCircle } from 'lucide-react';

interface ConditionListProps {
  conditions: Condition[];
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export function ConditionList({ conditions, onRemove, readOnly = false }: ConditionListProps) {
  if (!conditions || conditions.length === 0) {
    return <p className="text-sm text-[#6e7771] italic py-2">No health conditions recorded.</p>;
  }

  return (
    <div className="space-y-2.5">
      {conditions.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e7e0] bg-white p-3.5 shadow-2xs transition-all hover:border-[#b8c9bf] hover:shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ddf2e8] text-[#14382f]">
              <HeartPulse className="h-3.5 w-3.5 text-[#2b8a7e]" />
            </div>
            <div>
              <span className="font-bold text-sm text-[#14382f] capitalize">{c.name}</span>
              {c.since && (
                <span className="text-xs text-[#6e7771] ml-2">Since {c.since}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <SourceBadge provenance={c.provenance} />
            {!readOnly && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                className="inline-flex items-center gap-1 text-[11px] text-[#859088] hover:text-rose-700 transition-colors"
                title="Remove condition"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="sr-only">Remove</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}