'use client';

// Owner: P1. Patient Vault Dashboard
// Client-only zustand store integration. Hydrates after mount.

import { useState } from 'react';
import Link from 'next/link';
import { useVault } from '@/lib/vault';
import { analyzeRecord } from '@/lib/analyze';
import { useIsMounted } from '@/lib/useIsMounted';
import {
  AllergyList,
  ConditionList,
  MedicineList,
  LabTrend,
  Timeline,
  FlagList,
} from '@/components/record';

export default function VaultPage() {
  const mounted = useIsMounted();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<'medication' | 'allergy' | 'condition'>('medication');
  const [formData, setFormData] = useState({
    name: '',
    substance: '',
    reaction: '',
    strength: '',
    dosage: '',
  });

  const {
    record,
    loadDemo,
    updateItem,
    removeItem,
    setAllergyStatus,
    addPatientReportedItem,
    deleteAllData,
  } = useVault();

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-4xl items-center justify-center p-6">
        <p className="text-sm text-zinc-500">Loading your private vault...</p>
      </main>
    );
  }

  // Today in ISO format (2026-10-10)
  const today = new Date().toISOString().slice(0, 10);
  const flags = record ? analyzeRecord(record, today) : [];
  const pendingCount = record?.pendingReview?.length || 0;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      {/* Disclaimer Top Banner */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
        <span>
          Synthetic Demonstration Data · Local browser storage only · <strong>Do not enter real medical records</strong>
        </span>
        <span className="font-mono text-[11px] text-amber-800">Hackathon Prototype</span>
      </div>

      {!record ? (
        /* Empty State */
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-2xl font-bold">
            🏥
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-zinc-900">Your Health Vault is Empty</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Start by importing medical records, or load the synthetic demo patient (Meena Krishnan) to explore the workflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => loadDemo('start')}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              Load Demo (Unreconciled Start)
            </button>
            <button
              type="button"
              onClick={() => loadDemo('complete')}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Load Demo (Fully Reconciled)
            </button>
            <Link
              href="/vault/import"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Import Documents
            </Link>
          </div>
        </div>
      ) : (
        /* Populated Vault */
        <>
          {/* Patient Header & Primary Actions */}
          <header className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    PATIENT VAULT
                  </span>
                  <span className="text-xs text-zinc-400">Stored on your device</span>
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
                  {record.profile.name}
                </h1>
                <p className="text-xs text-zinc-500">
                  DOB: {record.profile.dateOfBirth} · {record.profile.sex}
                  {record.profile.emergencyContact && (
                    <span> · Emergency Contact: {record.profile.emergencyContact.name} ({record.profile.emergencyContact.phone})</span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/vault/import"
                  className="relative inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <span>Import Records</span>
                  {pendingCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/vault/share"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <span>Share Summary</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <span>{showAddForm ? '✕ Cancel' : '+ Add Item'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Load demo patient starting state?')) {
                      loadDemo('start');
                    }
                  }}
                  className="rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
                  title="Reset to initial unreviewed state"
                >
                  Reset Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete all stored health data and active shares from your browser?')) {
                      deleteAllData();
                    }
                  }}
                  className="rounded-lg border border-rose-200 px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Wipe local storage and indexedDB"
                >
                  Delete All
                </button>
              </div>
            </div>

            {/* Expandable Add Patient-Reported Item Form */}
            {showAddForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addPatientReportedItem(addType, formData);
                  setFormData({ name: '', substance: '', reaction: '', strength: '', dosage: '' });
                  setShowAddForm(false);
                }}
                className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                      Add Patient-Reported Fact
                    </span>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                      Provenance: Patient-reported
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {(['medication', 'allergy', 'condition'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAddType(t)}
                        className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                          addType === t
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  {addType === 'medication' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                          Medication Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Escitalopram"
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                          Strength
                        </label>
                        <input
                          type="text"
                          value={formData.strength}
                          onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                          placeholder="e.g. 10 mg"
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                          Dosage / Instructions
                        </label>
                        <input
                          type="text"
                          value={formData.dosage}
                          onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                          placeholder="e.g. 1 tablet daily at bedtime"
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {addType === 'allergy' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                          Allergen Substance *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.substance}
                          onChange={(e) => setFormData({ ...formData, substance: e.target.value })}
                          placeholder="e.g. Penicillin / Sulfa drugs"
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                          Known Reaction
                        </label>
                        <input
                          type="text"
                          value={formData.reaction}
                          onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
                          placeholder="e.g. Urticaria, swelling, anaphylaxis"
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {addType === 'condition' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                        Condition / Diagnosis *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Migraine / Seasonal Asthma"
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
                  >
                    Save to Vault
                  </button>
                </div>
              </form>
            )}

            {/* Pending Review Banner */}
            {pendingCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950">
                <div>
                  <span className="font-semibold">{pendingCount} item(s) awaiting your review!</span>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Extracted facts are held in a private staging queue and will never be shared until you confirm them.
                  </p>
                </div>
                <Link
                  href="/vault/import"
                  className="rounded bg-amber-800 px-3 py-1 text-xs font-medium text-white hover:bg-amber-900 transition-colors shrink-0"
                >
                  Review Queue →
                </Link>
              </div>
            )}
          </header>

          {/* Clinical Reconciliation Flags */}
          {flags.length > 0 && (
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
              <FlagList flags={flags} />
            </section>
          )}

          {/* 1. Allergies */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-zinc-900 flex items-center justify-between">
              <span>Allergies & Adverse Drug Reactions</span>
              <span className="text-xs font-normal text-zinc-500">
                {record.allergies.length} documented
              </span>
            </h2>
            <AllergyList
              allergies={record.allergies}
              status={record.allergyStatus}
              onStatusChange={setAllergyStatus}
              onRemove={removeItem}
            />
          </section>

          {/* 2. Medications */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-zinc-900 flex items-center justify-between">
              <span>Current & Prescribed Medications</span>
              <span className="text-xs font-normal text-zinc-500">
                {record.medications.filter((m) => m.status === 'active').length} active
              </span>
            </h2>
            <MedicineList
              medications={record.medications}
              onStop={(id) => updateItem(id, { status: 'stopped' })}
              onRemove={removeItem}
            />
          </section>

          {/* 3. Conditions */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-zinc-900 flex items-center justify-between">
              <span>Documented Conditions</span>
              <span className="text-xs font-normal text-zinc-500">
                {record.conditions.length} recorded
              </span>
            </h2>
            <ConditionList conditions={record.conditions} />
          </section>

          {/* 4. Lab Results */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-zinc-900 flex items-center justify-between">
              <span>Laboratory Results & Trends</span>
              <span className="text-xs font-normal text-zinc-500">
                {record.labs.length} tests recorded
              </span>
            </h2>
            <LabTrend labs={record.labs} onRemove={removeItem} />
          </section>

          {/* 5. Care Events */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-zinc-900 flex items-center justify-between">
              <span>Care Timeline & Procedures</span>
              <span className="text-xs font-normal text-zinc-500">
                {record.events.length} events
              </span>
            </h2>
            <Timeline events={record.events} onRemove={removeItem} />
          </section>

          {/* 6. Source Documents on File */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-zinc-900 flex items-center justify-between">
              <span>Source Documents ({record.documents.length})</span>
              <Link href="/vault/import" className="text-xs text-indigo-600 hover:underline">
                + Add more
              </Link>
            </h2>

            {record.documents.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No documents attached yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {record.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-zinc-900 block truncate">{doc.title}</span>
                      <p className="text-zinc-500 mt-0.5">
                        {doc.docType} · {doc.date || 'No date'}
                        {doc.facility ? ` · ${doc.facility}` : ''}
                      </p>
                    </div>
                    {doc.clinician && (
                      <p className="text-[11px] text-zinc-400 mt-2">Clinician: {doc.clinician}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
