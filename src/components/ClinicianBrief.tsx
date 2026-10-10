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
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Patient & Encrypted Share Header */}
      <header className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#14382f] text-[#ddf2e8] text-xl font-bold shadow-xs">
              <Stethoscope className="h-7 w-7 text-[#3eb4a4]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-xs font-bold text-[#14382f]">
                  CLINICIAN BRIEF
                </span>
                {recipientLabel && (
                  <span className="text-xs text-[#6e7771]">
                    Prepared for: <strong className="text-[#14382f]">{recipientLabel}</strong>
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14382f]">
                {patient.name}
              </h1>
              <p className="text-xs text-[#525d56] mt-0.5">
                Age: <strong className="text-[#1c2420]">{patient.age}</strong> · Sex: <strong className="text-[#1c2420] capitalize">{patient.sex}</strong>
                {patient.emergencyContact && (
                  <span className="ml-2">
                    · Emergency: <strong>{patient.emergencyContact.name}</strong> ({patient.emergencyContact.phone})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 text-xs text-[#6e7771]">
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="print:hidden inline-flex items-center gap-1.5 rounded-xl border border-[#d6ded5] bg-white px-3.5 py-1.5 font-bold text-[#14382f] shadow-2xs hover:bg-[#f1f4ee] transition-all"
              title="Print or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5 text-[#2b8a7e]" />
              <span>Print / Save PDF</span>
            </button>
            <p>Shared: <span className="font-mono text-[#1c2420]">{createdDate}</span></p>
            <p className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-900 border border-amber-200">
              <Clock className="h-3 w-3 text-amber-700" />
              <span>Expires: {expiresDate}</span>
            </p>
          </div>
        </div>

        {/* Source Badges Legend */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#eef2ec] pt-3 text-[11px] text-[#6e7771]">
          <span className="font-bold text-[#14382f]">Source Provenance:</span>
          <span className="rounded-md bg-[#f1f4ee] px-2 py-0.5 text-[#505a54] border border-[#d6ded5]">Patient-reported</span>
          <span className="rounded-md bg-[#eef8f4] px-2 py-0.5 text-[#14382f] border border-[#c8e6dc]">From document · confirmed by patient</span>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900 border border-amber-200">From document · corrected by patient</span>
        </div>
      </header>

      {/* Clinician Quick Search Bar (Hidden when printed) */}
      <div className="print:hidden relative bg-white rounded-xl border border-[#d6ded5] p-2.5 shadow-2xs flex items-center gap-2">
        <Search className="h-4 w-4 text-[#6e7771] ml-1 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter authorized records (e.g. Metformin, Allergy, Creatinine)..."
          className="w-full text-xs text-[#1c2420] placeholder-[#8a948e] focus:outline-none bg-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-[#6e7771] hover:text-[#1c2420] p-1 rounded-md"
            title="Clear filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Withheld Items Alert Banner */}
      {withheldCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 shadow-2xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <span>Patient Privacy Disclosure: {withheldCount} Item(s) Withheld</span>
          </div>
          <p className="leading-relaxed pl-6 text-[#4a3b10]">
            The patient chose to withhold <strong>{withheldCount} item(s)</strong> from this shared view. This summary represents a partial record. Please verify complete medication and clinical history directly during consult.
          </p>
        </div>
      )}

      {/* 1. Allergies Section (Priority 1) */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between border-b border-rose-100 pb-3">
          <span>⚠️ Allergies &amp; Adverse Drug Reactions</span>
          <span className="text-xs font-normal text-rose-700">Priority Clinical Scan</span>
        </h2>
        <AllergyList allergies={filtered.allergies} status={allergyStatus} readOnly={true} />
      </section>

      {/* 2. Reconciliation & Safety Flags */}
      {flags && flags.length > 0 && !filtered.isFiltered && (
        <section className="glass-panel rounded-2xl p-6 shadow-xs">
          <FlagList flags={flags} title="Clinical Reconciliation Flags (For Review)" />
        </section>
      )}

      {/* 3. Active Medications */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[#14382f]">
            Current &amp; Active Medications
          </h2>
          <span className="text-xs text-[#6e7771]">
            {filtered.medications.filter((m) => m.status === 'active').length} active regimens
          </span>
        </div>
        <MedicineList medications={filtered.medications} readOnly={true} />
      </section>

      {/* 4. Active Conditions */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[#14382f]">Active Health Conditions</h2>
        </div>
        <ConditionList conditions={filtered.conditions} readOnly={true} />
      </section>

      {/* 5. Laboratory Results & Trends */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[#14382f]">Laboratory Results &amp; Longitudinal Trends</h2>
        </div>
        <LabTrend labs={filtered.labs} readOnly={true} />
      </section>

      {/* 6. Timeline & Encounters */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[#14382f]">Clinical Encounters &amp; Procedures</h2>
        </div>
        <Timeline events={filtered.events} readOnly={true} />
      </section>

      {/* Medical Device & Synthetic Disclaimer */}
      <footer className="rounded-2xl border border-[#d6ded5] bg-[#f8f9f5] p-5 text-center text-xs text-[#6e7771] space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-center gap-1.5 font-bold text-[#14382f]">
          <ShieldCheck className="h-4 w-4 text-[#2b8a7e]" />
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
