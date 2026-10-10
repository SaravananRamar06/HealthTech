// src/components/record/SourceBadge.tsx - Provenance label
// Owner: P1. Strictly one of four exact wording strings per AGENTS.md.

import type { Provenance } from '@/lib/types';
import { User, FileText, Edit3 } from 'lucide-react';

export function SourceBadge({ provenance }: { provenance: Provenance }) {
  if (provenance.kind === 'patient-reported') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#d6ded5] bg-[#f1f4ee] px-2 py-0.5 text-[11px] font-medium text-[#46504a] shadow-2xs">
        <User className="h-3 w-3 text-[#6e7771]" />
        <span>Patient-reported</span>
      </span>
    );
  }

  const isCorrected = provenance.edited;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium shadow-2xs cursor-help transition-colors ${
        isCorrected
          ? 'border-amber-200 bg-amber-50/90 text-amber-900'
          : 'border-[#c8e6dc] bg-[#eef8f4] text-[#14382f]'
      }`}
      title={`${provenance.confidence.toUpperCase()} confidence\nExcerpt: "${provenance.excerpt}"`}
    >
      {isCorrected ? (
        <Edit3 className="h-3 w-3 text-amber-700 shrink-0" />
      ) : (
        <FileText className="h-3 w-3 text-[#2b8a7e] shrink-0" />
      )}
      <span>From document · {isCorrected ? 'corrected by patient' : 'confirmed by patient'}</span>
    </span>
  );
}