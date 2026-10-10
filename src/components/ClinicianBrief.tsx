// src/components/ClinicianBrief.tsx - One-screen clinical brief for consults
// Owner: P4. Designed for 30-second clinician review: allergies first, flags, medicines, lab trends, timeline, withheld banner.

import type { SharePayload } from '@/lib/types';
import {
  AllergyList,
  ConditionList,
  MedicineList,
  LabTrend,
  Timeline,
  FlagList,
} from '@/components/record';
import { ShieldCheck, Clock, AlertTriangle, Stethoscope } from 'lucide-react';

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
                Age: <strong className="text-[#1c2420]">{patient.age}</strong> · Sex: <strong className="text-[#1c2420]">{patient.sex}</strong>
                {patient.emergencyContact && (
                  <span className="ml-2">
                    · Emergency: <strong>{patient.emergencyContact.name}</strong> ({patient.emergencyContact.phone})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-[#6e7771] space-y-1">
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
        <AllergyList allergies={allergies} status={allergyStatus} readOnly={true} />
      </section>

      {/* 2. Reconciliation & Safety Flags */}
      {flags && flags.length > 0 && (
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
            {medications.filter((m) => m.status === 'active').length} active regimens
          </span>
        </div>
        <MedicineList medications={medications} readOnly={true} />
      </section>

      {/* 4. Active Conditions */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[#14382f]">Active Health Conditions</h2>
        </div>
        <ConditionList conditions={conditions} />
      </section>

      {/* 5. Laboratory Results & Trends */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[#14382f]">Laboratory Results &amp; Longitudinal Trends</h2>
        </div>
        <LabTrend labs={labs} readOnly={true} />
      </section>

      {/* 6. Timeline & Encounters */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[#14382f]">Clinical Encounters &amp; Procedures</h2>
        </div>
        <Timeline events={events} readOnly={true} />
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
