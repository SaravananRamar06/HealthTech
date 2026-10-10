// src/components/record/ConditionList.tsx - Conditions with source badges
// Owner: P1

import type { Condition } from '@/lib/types';
import { SourceBadge } from './SourceBadge';

export function ConditionList({ conditions }: { conditions: Condition[] }) {
  if (!conditions || conditions.length === 0) {
    return <p className="text-sm text-zinc-500 italic">No health conditions recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {conditions.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900 capitalize">{c.name}</span>
            {c.since && <span className="text-xs text-zinc-500">Since {c.since}</span>}
          </div>
          <SourceBadge provenance={c.provenance} />
        </div>
      ))}
    </div>
  );
}