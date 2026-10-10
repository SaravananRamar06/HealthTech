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
import {
  FileText,
  Share2,
  PlusCircle,
  RotateCcw,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function VaultPage() {
  const mounted = useIsMounted();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<'medication' | 'allergy' | 'condition'>('medication');
  const [activeTab, setActiveTab] = useState<'all' | 'medications' | 'allergies' | 'conditions' | 'labs' | 'timeline'>('all');
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
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#14382f] border-t-transparent" />
          <p className="text-sm font-medium text-[#525d56]">Accessing local encrypted vault...</p>
        </div>
      </main>
    );
  }

  // Today in ISO format (2026-10-10)
  const today = new Date().toISOString().slice(0, 10);
  const flags = record ? analyzeRecord(record, today) : [];
  const pendingCount = record?.pendingReview?.length || 0;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Disclaimer Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-950 shadow-2xs backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            Synthetic Demonstration Data · Local browser storage only · <strong>Do not enter real medical records</strong>
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-200/60 rounded px-2 py-0.5">
          Prototype
        </span>
      </div>

      {!record ? (
        /* Empty State */
        <div className="glass-panel rounded-3xl p-10 text-center shadow-xs space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ddf2e8] text-[#14382f] text-2xl font-bold shadow-xs">
            <ShieldCheck className="h-8 w-8 text-[#2b8a7e]" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#14382f]">Your Health Vault is Empty</h2>
            <p className="text-sm text-[#525d56] leading-relaxed">
              Import medical records from photos or PDFs, or load the synthetic demo patient (Meena Krishnan) to explore the clinical reconciliation engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => loadDemo('start')}
              className="rounded-xl bg-[#14382f] px-5 py-3 text-sm font-semibold text-[#ddf2e8] shadow-sm hover:bg-[#1a473c] transition-all"
            >
              Load Demo (Unreconciled Start)
            </button>
            <button
              type="button"
              onClick={() => loadDemo('complete')}
              className="rounded-xl border border-[#d6ded5] bg-white px-5 py-3 text-sm font-semibold text-[#202823] hover:bg-[#f1f4ee] transition-all"
            >
              Load Demo (Fully Reconciled)
            </button>
            <Link
              href="/vault/import"
              className="rounded-xl border border-[#d6ded5] bg-white px-5 py-3 text-sm font-semibold text-[#202823] hover:bg-[#f1f4ee] transition-all"
            >
              Import Documents
            </Link>
          </div>
        </div>
      ) : (
        /* Populated Vault */
        <>
          {/* Patient Header & Quick Bar */}
          <header className="glass-panel rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#14382f] text-[#ddf2e8] text-xl font-bold shadow-xs">
                  {record.profile.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-xs font-bold text-[#14382f]">
                      PATIENT VAULT
                    </span>
                    <span className="text-xs text-[#6e7771]">Encrypted on device</span>
                  </div>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14382f]">
                    {record.profile.name}
                  </h1>
                  <p className="text-xs text-[#525d56] mt-0.5">
                    DOB: <strong className="text-[#1c2420]">{record.profile.dateOfBirth}</strong> · Sex: <strong className="text-[#1c2420]">{record.profile.sex}</strong>
                    {record.profile.emergencyContact && (
                      <span className="ml-2">
                        · Emergency Contact: <strong>{record.profile.emergencyContact.name}</strong> ({record.profile.emergencyContact.phone})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/vault/import"
                  className="relative inline-flex items-center gap-1.5 rounded-xl bg-[#14382f] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1a473c] transition-all"
                >
                  <FileText className="h-3.5 w-3.5 text-[#3eb4a4]" />
                  <span>Import Records</span>
                  {pendingCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                      {pendingCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/vault/share"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#d6ded5] bg-white px-4 py-2.5 text-xs font-bold text-[#202823] hover:bg-[#f1f4ee] transition-all shadow-2xs"
                >
                  <Share2 className="h-3.5 w-3.5 text-[#2b8a7e]" />
                  <span>Share Summary</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#39A99A]/40 bg-[#ddf2e8]/70 px-3.5 py-2.5 text-xs font-bold text-[#14382f] hover:bg-[#ccebe0] transition-all shadow-2xs"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-[#2b8a7e]" />
                  <span>{showAddForm ? 'Cancel' : 'Add Item'}</span>
                </button>

                <div className="hidden sm:block h-6 w-px bg-[#d6ded5] mx-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset to Meena Krishnan starting demo state?')) {
                      loadDemo('start');
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#e2e7e0] bg-white px-2.5 py-2.5 text-xs text-[#525d56] hover:bg-[#f1f4ee] transition-all"
                  title="Reset Demo State"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete all stored health records and shares from this browser?')) {
                      deleteAllData();
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-2.5 text-xs text-rose-700 hover:bg-rose-50 transition-all"
                  title="Wipe Storage"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Wipe</span>
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
                className="mt-4 rounded-2xl border border-[#b8decb] bg-[#f0f9f5] p-5 space-y-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ccebe0] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#2b8a7e]" />
                    <span className="text-xs font-bold text-[#14382f] uppercase tracking-wide">
                      Add Patient-Reported Fact
                    </span>
                    <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-[10px] font-bold text-[#14382f]">
                      Provenance: Patient-reported
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {(['medication', 'allergy', 'condition'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAddType(t)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition-all ${
                          addType === t
                            ? 'bg-[#14382f] text-white shadow-xs'
                            : 'bg-white text-[#525d56] border border-[#d6ded5] hover:bg-[#f1f4ee]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
                  {addType === 'medication' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-[#14382f] mb-1">
                          Medication Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Escitalopram"
                          className="w-full rounded-xl border border-[#d6ded5] bg-white px-3.5 py-2 text-[#1c2420] focus:border-[#2b8a7e] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#14382f] mb-1">
                          Strength
                        </label>
                        <input
                          type="text"
                          value={formData.strength}
                          onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                          placeholder="e.g. 10 mg"
                          className="w-full rounded-xl border border-[#d6ded5] bg-white px-3.5 py-2 text-[#1c2420] focus:border-[#2b8a7e] focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-[#14382f] mb-1">
                          Dosage / Instructions
                        </label>
                        <input
                          type="text"
                          value={formData.dosage}
                          onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                          placeholder="e.g. 1 tablet daily at bedtime"
                          className="w-full rounded-xl border border-[#d6ded5] bg-white px-3.5 py-2 text-[#1c2420] focus:border-[#2b8a7e] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {addType === 'allergy' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-[#14382f] mb-1">
                          Allergen Substance *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.substance}
                          onChange={(e) => setFormData({ ...formData, substance: e.target.value })}
                          placeholder="e.g. Penicillin / Sulfa drugs"
                          className="w-full rounded-xl border border-[#d6ded5] bg-white px-3.5 py-2 text-[#1c2420] focus:border-[#2b8a7e] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#14382f] mb-1">
                          Known Reaction
                        </label>
                        <input
                          type="text"
                          value={formData.reaction}
                          onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
                          placeholder="e.g. Urticaria, swelling, anaphylaxis"
                          className="w-full rounded-xl border border-[#d6ded5] bg-white px-3.5 py-2 text-[#1c2420] focus:border-[#2b8a7e] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {addType === 'condition' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-[#14382f] mb-1">
                        Condition / Diagnosis *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Migraine / Seasonal Asthma"
                        className="w-full rounded-xl border border-[#d6ded5] bg-white px-3.5 py-2 text-[#1c2420] focus:border-[#2b8a7e] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ccebe0]">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-[#525d56] hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#14382f] px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#1a473c] transition-colors"
                  >
                    Save to Vault
                  </button>
                </div>
              </form>
            )}

            {/* Pending Review Queue Banner */}
            {pendingCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200/80 text-amber-900 font-bold">
                    {pendingCount}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-amber-950 block">
                      {pendingCount} item(s) awaiting your review
                    </span>
                    <p className="text-amber-900/80 text-[11px] mt-0.5">
                      Extracted facts are held in your private staging queue and will never be shared until you confirm them.
                    </p>
                  </div>
                </div>
                <Link
                  href="/vault/import"
                  className="rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white hover:bg-amber-950 transition-colors shadow-2xs shrink-0"
                >
                  Open Review Queue →
                </Link>
              </div>
            )}
          </header>

          {/* Clinical Reconciliation Flags */}
          {flags.length > 0 && (
            <section className="glass-panel rounded-2xl p-6 shadow-xs">
              <FlagList flags={flags} />
            </section>
          )}

          {/* Section Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'All Records' },
              { id: 'medications', label: `Medications (${record.medications.filter((m) => m.status === 'active').length})` },
              { id: 'allergies', label: `Allergies (${record.allergies.length})` },
              { id: 'conditions', label: `Conditions (${record.conditions.length})` },
              { id: 'labs', label: `Labs (${record.labs.length})` },
              { id: 'timeline', label: `Timeline (${record.events.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`rounded-xl px-3.5 py-2 font-bold whitespace-nowrap transition-all shadow-2xs ${
                  activeTab === tab.id
                    ? 'bg-[#14382f] text-[#ddf2e8] shadow-xs'
                    : 'bg-white text-[#525d56] border border-[#d6ded5] hover:bg-[#f1f4ee]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 1. Allergies Section */}
          {(activeTab === 'all' || activeTab === 'allergies') && (
            <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[#14382f]">
                  Allergies &amp; Adverse Drug Reactions
                </h2>
                <span className="text-xs text-[#6e7771]">
                  {record.allergies.length} documented
                </span>
              </div>
              <AllergyList
                allergies={record.allergies}
                status={record.allergyStatus}
                onStatusChange={setAllergyStatus}
                onRemove={removeItem}
              />
            </section>
          )}

          {/* 2. Medications Section */}
          {(activeTab === 'all' || activeTab === 'medications') && (
            <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[#14382f]">
                  Current &amp; Prescribed Medications
                </h2>
                <span className="text-xs text-[#6e7771]">
                  {record.medications.filter((m) => m.status === 'active').length} active
                </span>
              </div>
              <MedicineList
                medications={record.medications}
                onStop={(id) => updateItem(id, { status: 'stopped' })}
                onRemove={removeItem}
              />
            </section>
          )}

          {/* 3. Conditions Section */}
          {(activeTab === 'all' || activeTab === 'conditions') && (
            <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[#14382f]">
                  Documented Conditions
                </h2>
                <span className="text-xs text-[#6e7771]">
                  {record.conditions.length} recorded
                </span>
              </div>
              <ConditionList conditions={record.conditions} />
            </section>
          )}

          {/* 4. Lab Results Section */}
          {(activeTab === 'all' || activeTab === 'labs') && (
            <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[#14382f]">
                  Laboratory Results &amp; Trends
                </h2>
                <span className="text-xs text-[#6e7771]">
                  {record.labs.length} tests recorded
                </span>
              </div>
              <LabTrend labs={record.labs} onRemove={removeItem} />
            </section>
          )}

          {/* 5. Care Events Timeline */}
          {(activeTab === 'all' || activeTab === 'timeline') && (
            <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
                <h2 className="text-base font-bold text-[#14382f]">
                  Care Timeline &amp; Encounters
                </h2>
                <span className="text-xs text-[#6e7771]">
                  {record.events.length} events
                </span>
              </div>
              <Timeline events={record.events} onRemove={removeItem} />
            </section>
          )}

          {/* 6. Source Documents on File */}
          <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
              <h2 className="text-base font-bold text-[#14382f]">
                Source Documents on File ({record.documents.length})
              </h2>
              <Link
                href="/vault/import"
                className="text-xs font-bold text-[#2b8a7e] hover:underline"
              >
                + Add more documents
              </Link>
            </div>

            {record.documents.length === 0 ? (
              <p className="text-sm text-[#6e7771] italic py-2">No documents attached yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {record.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between rounded-xl border border-[#e2e7e0] bg-[#f8f9f5] p-3.5 text-xs shadow-2xs hover:border-[#b8c9bf] transition-colors"
                  >
                    <div>
                      <span className="font-bold text-[#14382f] block truncate">{doc.title}</span>
                      <p className="text-[#6e7771] mt-0.5">
                        {doc.docType} · {doc.date || 'No date'}
                        {doc.facility ? ` · ${doc.facility}` : ''}
                      </p>
                    </div>
                    {doc.clinician && (
                      <p className="text-[11px] text-[#859088] mt-2 pt-2 border-t border-[#e8eee6]">
                        Prescriber / Clinician: {doc.clinician}
                      </p>
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
