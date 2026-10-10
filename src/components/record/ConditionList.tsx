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
    return <p className="text-sm text-[color:var(--muted-grey)] italic py-2">No health conditions recorded.</p>;
  }

  return (
    <div className="space-y-2.5">
      {conditions.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-card)] bg-white p-3.5 shadow-2xs transition-colors hover:border-[var(--border-strong)] hover:shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--mint-100)] text-[color:var(--brand-ink)]">
              <HeartPulse className="h-3.5 w-3.5 text-[color:var(--teal-text)]" />
            </div>
            <div>
              <span className="font-bold text-sm text-[color:var(--brand-ink)] capitalize">{c.name}</span>
              {c.since && (
                <span className="text-[13px] text-[color:var(--muted-grey)] ml-2">Since {c.since}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <SourceBadge provenance={c.provenance} />
            {!readOnly && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                className="inline-flex items-center gap-1 text-[12px] text-[color:var(--muted-grey)] hover:text-rose-700 transition-colors"
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