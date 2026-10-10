// src/components/record/SourceBadge.tsx - Provenance label
// Owner: P1. One of four exact wording strings per AGENTS.md.

import type { Provenance } from '@/lib/types';

export function SourceBadge({ provenance }: { provenance: Provenance }) {
  if (provenance.kind === 'patient-reported') {
    return <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">Patient-reported</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-800"
      title={`${provenance.confidence} confidence · "${provenance.excerpt}"`}
    >
      From document · {provenance.edited ? 'corrected by patient' : 'confirmed by patient'}
    </span>
  );
}