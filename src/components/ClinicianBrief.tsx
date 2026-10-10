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
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      {/* Patient & Encrypted Share Header */}
      <header className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                CLINICIAN BRIEF
              </span>
              {recipientLabel && (
                <span className="text-xs text-zinc-500">Prepared for: <strong>{recipientLabel}</strong></span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              {patient.name}
            </h1>
            <p className="text-sm text-zinc-600">
              {patient.age} years old · {patient.sex}
              {patient.emergencyContact && (
                <span> · Emergency: {patient.emergencyContact.name} ({patient.emergencyContact.phone})</span>
              )}
            </p>
          </div>

          <div className="text-right text-xs text-zinc-500 space-y-0.5">
            <p>Shared: {createdDate}</p>
            <p className="text-amber-700 font-medium">Expires: {expiresDate}</p>
          </div>
        </div>

        {/* Source Badges Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
          <span className="font-semibold text-zinc-700">Source Legend:</span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">Patient-reported</span>
          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-800">From document · confirmed by patient</span>
          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-800">From document · corrected by patient</span>
        </div>
      </header>

      {/* Withheld Items Alert Banner */}
      {withheldCount > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900">
          <p className="font-semibold">Patient Privacy Notice</p>
          <p className="mt-0.5">
            <strong>{withheldCount} item(s)</strong> withheld by the patient from this share.
            This picture of care is partial. Verify complete history directly with the patient.
          </p>
        </div>
      )}

      {/* 1. Allergies Section (Priority 1) */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-base font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
          <span>⚠️ Allergies & Adverse Reactions</span>
        </h2>
        <AllergyList allergies={allergies} status={allergyStatus} readOnly={true} />
      </section>

      {/* 2. Reconciliation & Safety Flags */}
      {flags && flags.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <FlagList flags={flags} title="Clinical Reconciliation Flags (For Review)" />
        </section>
      )}

      {/* 3. Active Medications */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-base font-bold text-zinc-900 flex items-center justify-between">
          <span>Current Medications</span>
          <span className="text-xs font-normal text-zinc-500">
            {medications.filter((m) => m.status === 'active').length} active
          </span>
        </h2>
        <MedicineList medications={medications} readOnly={true} />
      </section>

      {/* 4. Active Conditions */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-base font-bold text-zinc-900">Active Health Conditions</h2>
        <ConditionList conditions={conditions} />
      </section>

      {/* 5. Laboratory Results & Trends */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-base font-bold text-zinc-900">Laboratory Results & Longitudinal Trends</h2>
        <LabTrend labs={labs} readOnly={true} />
      </section>

      {/* 6. Timeline & Procedures */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-base font-bold text-zinc-900">Clinical Encounters & Procedures</h2>
        <Timeline events={events} readOnly={true} />
      </section>

      {/* Medical Device & Synthetic Disclaimer */}
      <footer className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center text-xs text-zinc-500 space-y-1">
        <p className="font-semibold text-zinc-700">Demonstration Prototype · Synthetic Data Only</p>
        <p>
          Handover is not a certified medical device and does not provide clinical diagnoses, treatment advice, or drug-drug interaction screening.
          Always confirm medication details and critical allergies directly with the patient.
        </p>
      </footer>
    </div>
  );
}
