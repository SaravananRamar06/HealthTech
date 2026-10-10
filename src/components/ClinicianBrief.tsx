// src/components/ClinicianBrief.tsx - One-screen clinical brief for consults
// Owner: P4. Designed for 30-second clinician review: allergies first, flags, medicines, lab trends, timeline, withheld banner.

import { useState, useMemo } from 'react';
import type { SharePayload } from '@/lib/types';
import {
  AllergyList,
  ConditionList,
  MedicineList,
  LabTrend,
  Timeline,
  FlagList,
} from '@/components/record';
import { ShieldCheck, Clock, AlertTriangle, Stethoscope, Printer, Search, X } from 'lucide-react';

export default function ClinicianBrief({ payload }: { payload: SharePayload }) {
  const {
    patient,
    recipientLabel,
    expiresAt,
    createdAt,
    allergyStatus,
    allergies,
    conditions,
    medications,
    labs,
    events,
    flags,
    withheldCount,
  } = payload;

  const [query, setQuery] = useState('');

  const createdDate = new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const expiresDate = new Date(expiresAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Filtered data based on clinician search
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { allergies, conditions, medications, labs, events, isFiltered: false };
    }

    const matches = (s: string | null | undefined) => (s ? s.toLowerCase().includes(q) : false);

    return {
      allergies: allergies.filter((a) => matches(a.substance) || matches(a.reaction)),
      conditions: conditions.filter((c) => matches(c.name)),
      medications: medications.filter(
        (m) =>
          matches(m.name) ||
          matches(m.dosage) ||
          matches(m.strength) ||
          m.ingredients.some((ing) => matches(ing)) ||
          matches(m.prescriber)
      ),
      labs: labs.filter((l) => matches(l.test) || matches(l.unit)),
      events: events.filter((e) => matches(e.title) || matches(e.facility)),
      isFiltered: true,
    };
  }, [allergies, conditions, medications, labs, events, query]);

  return (
    <div className="app-shell clinician-shell space-y-6">
      {/* Patient & Encrypted Share Header */}
      <header className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--forest-800)] text-[#e4eee5] text-xl font-bold shadow-xs">
              <Stethoscope className="h-7 w-7 text-[#8ccab5]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[13px] font-bold text-[color:var(--brand-ink)]">
                  CLINICIAN BRIEF
                </span>
                {recipientLabel && (
                  <span className="text-[13px] text-[color:var(--muted-grey)]">
                    Prepared for: <strong className="text-[color:var(--brand-ink)]">{recipientLabel}</strong>
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[color:var(--brand-ink)]">
                {patient.name}
              </h1>
              <p className="text-[13px] text-[color:var(--muted-grey)] mt-0.5">
                Age: <strong className="text-[color:var(--brand-ink)]">{patient.age}</strong> · Sex: <strong className="text-[color:var(--brand-ink)] capitalize">{patient.sex}</strong>
                {patient.emergencyContact && (
                  <span className="ml-2">
                    · Emergency: <strong>{patient.emergencyContact.name}</strong> ({patient.emergencyContact.phone})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 text-[13px] text-[color:var(--muted-grey)]">
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="print:hidden inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-1.5 font-bold text-[color:var(--brand-ink)] shadow-2xs hover:bg-[var(--surface-muted)] transition-colors"
              title="Print or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5 text-[color:var(--teal-text)]" />
              <span>Print / Save PDF</span>
            </button>
            <p>Shared: <span className="font-mono text-[color:var(--brand-ink)]">{createdDate}</span></p>
            <p className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-900 border border-amber-200">
              <Clock className="h-3 w-3 text-amber-700" />
              <span>Expires: {expiresDate}</span>
            </p>
          </div>
        </div>

        {/* Source Badges Legend */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#eef2ec] pt-3 text-[12px] text-[color:var(--muted-grey)]">
          <span className="font-bold text-[color:var(--brand-ink)]">Source Provenance:</span>
          <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[color:var(--brand-ink)] border border-[var(--border-card)]">Patient-reported</span>
          <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[color:var(--brand-ink)] border border-[var(--border-strong)]">From document · confirmed by patient</span>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900 border border-amber-200">From document · corrected by patient</span>
        </div>
      </header>

      {/* Clinician Quick Search Bar (Hidden when printed) */}
      <div className="print:hidden relative bg-white rounded-xl border border-[var(--border-card)] p-2.5 shadow-2xs flex items-center gap-2">
        <Search className="h-4 w-4 text-[color:var(--muted-grey)] ml-1 shrink-0" />
        <input
          type="text"
          value={query}
          aria-label="Filter shared health records"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter authorized records (e.g. Metformin, Allergy, Creatinine)..."
          className="w-full text-[13px] text-[color:var(--brand-ink)] placeholder-[#737d74] focus:outline-none bg-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-[color:var(--muted-grey)] hover:text-[color:var(--brand-ink)] p-1 rounded-md"
            title="Clear filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Withheld Items Alert Banner */}
      {withheldCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-[13px] text-amber-950 shadow-2xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <span>Patient Privacy Disclosure: {withheldCount} Item(s) Withheld</span>
          </div>
          <p className="leading-relaxed pl-6 text-amber-900">
            The patient chose to withhold <strong>{withheldCount} item(s)</strong> from this shared view. This summary represents a partial record. Please verify complete medication and clinical history directly during consult.
          </p>
        </div>
      )}

      {/* 1. Allergies Section (Priority 1) */}
      <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between border-b border-rose-100 pb-3">
          <span>⚠️ Allergies &amp; Adverse Drug Reactions</span>
          <span className="text-[13px] font-normal text-rose-700">Priority Clinical Scan</span>
        </h2>
        {filtered.isFiltered && filtered.allergies.length === 0 ? <p className="text-sm text-[color:var(--muted-grey)]">No allergies match this search. Clear the filter to see the shared allergy history.</p> : <AllergyList allergies={filtered.allergies} status={allergyStatus} readOnly={true} />}
      </section>

      {/* 2. Reconciliation & Safety Flags */}
      {flags && flags.length > 0 && !filtered.isFiltered && (
        <section className="glass-panel record-section rounded-2xl p-6 shadow-xs">
          <FlagList flags={flags} title="Clinical Reconciliation Flags (For Review)" />
        </section>
      )}

      {/* 3. Active Medications */}
      <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[color:var(--brand-ink)]">
            Current &amp; Active Medications
          </h2>
          <span className="text-[13px] text-[color:var(--muted-grey)]">
            {filtered.medications.filter((m) => m.status === 'active').length} active regimens
          </span>
        </div>
        <MedicineList medications={filtered.medications} readOnly={true} />
      </section>

      {/* 4. Active Conditions */}
      <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[color:var(--brand-ink)]">Active Health Conditions</h2>
        </div>
        <ConditionList conditions={filtered.conditions} readOnly={true} />
      </section>

      {/* 5. Laboratory Results & Trends */}
      <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[color:var(--brand-ink)]">Laboratory Results &amp; Longitudinal Trends</h2>
        </div>
        <LabTrend labs={filtered.labs} readOnly={true} />
      </section>

      {/* 6. Timeline & Encounters */}
      <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[color:var(--brand-ink)]">Clinical Encounters &amp; Procedures</h2>
        </div>
        <Timeline events={filtered.events} readOnly={true} />
      </section>

      {/* Medical Device & Synthetic Disclaimer */}
      <footer className="rounded-2xl border border-[var(--border-card)] bg-[var(--background)] p-5 text-center text-[13px] text-[color:var(--muted-grey)] space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-center gap-1.5 font-bold text-[color:var(--brand-ink)]">
          <ShieldCheck className="h-4 w-4 text-[color:var(--teal-text)]" />
          <span>CareBridge Handover · Demonstration Prototype · Synthetic Data Only</span>
        </div>
        <p className="max-w-2xl mx-auto leading-relaxed">
          Handover is not a certified medical device and does not provide clinical diagnoses, dosing recommendations, or automated drug-drug interaction screening.
          Always confirm critical medication dosages and allergen profiles directly with the patient.
        </p>
      </footer>
    </div>
  );
}
