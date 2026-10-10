'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PatientRecord, GeneratedClinicalBrief } from '@/lib/types';
import {
  Stethoscope,
  X,
  Printer,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  Share2,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { generateDeterministicClinicalBrief } from '@/lib/ai/clinicalBrief';

interface ClinicalBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PatientRecord;
  aiMode: 'gemini' | 'local';
  onNavigateToShare?: () => void;
}

export function ClinicalBriefModal({
  isOpen,
  onClose,
  record,
  aiMode,
  onNavigateToShare,
}: ClinicalBriefModalProps) {
  const { showToast } = useToast();
  const [recipient, setRecipient] = useState('Dr. S. Rao (Endocrinology)');
  const [isGenerating, setIsGenerating] = useState(false);
  const [brief, setBrief] = useState<GeneratedClinicalBrief | null>(null);
  const [patientConfirmed, setPatientConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Section visibility toggles
  const [sections, setSections] = useState({
    profile: true,
    conditions: true,
    currentMeds: true,
    historicalMeds: true,
    allergies: true,
    labs: true,
    events: true,
    conflicts: true,
    sources: true,
  });

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setPatientConfirmed(false);
    try {
      if (aiMode === 'local') {
        setBrief(generateDeterministicClinicalBrief(record, recipient));
        return;
      }
      const res = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record,
          consented: aiMode === 'gemini',
          forceDeterministic: false,
          recipientLabel: recipient,
        }),
      });

      if (!res.ok) {
        throw new Error('Brief generation failed');
      }

      const data = await res.json();
      setBrief(data.brief);
    } catch {
      // Fall back to instant deterministic brief
      setBrief(generateDeterministicClinicalBrief(record, recipient));
    } finally {
      setIsGenerating(false);
    }
  }, [aiMode, record, recipient]);

  useEffect(() => {
    if (isOpen && !brief) {
      const timer = window.setTimeout(() => { void handleGenerate(); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, brief, handleGenerate]);

  if (!isOpen) return null;

  function handleCopy() {
    if (!brief) return;
    const textLines = [
      `CLINICIAN BRIEF — ${record.profile.name}`,
      `Prepared for: ${recipient}`,
      `Date: ${new Date().toLocaleDateString()}`,
      '----------------------------------------',
      ...(sections.profile ? [`PATIENT: ${brief.patientProfile}`] : []),
      '',
      ...(sections.conditions ? ['ACTIVE CONDITIONS:', ...brief.activeConditions.map((c) => `• ${c}`)] : []),
      '',
      ...(sections.currentMeds ? ['CURRENT MEDICATIONS:', ...brief.currentMedications.map((m) => `• ${m}`)] : []),
      '',
      ...(sections.currentMeds && sections.historicalMeds ? ['HISTORICAL / STOPPED MEDICATIONS:', ...brief.historicalMedications.map((m) => `• ${m}`)] : []),
      '',
      ...(sections.allergies ? ['ALLERGIES & REACTIONS:', ...brief.allergiesAndReactions.map((a) => `• ${a}`)] : []),
      '',
      ...(sections.labs ? ['RECENT LAB RESULTS:', ...brief.recentLabResults.map((l) => `• ${l}`)] : []),
      '',
      ...(sections.events ? ['PROCEDURES & CARE EVENTS:', ...brief.proceduresAndCareEvents.map((e) => `• ${e}`)] : []),
      '',
      ...(sections.conflicts ? ['CLINICAL CONFLICTS & DISCREPANCIES:', ...brief.conflictsAndUnverifiedInfo.map((ci) => `• ${ci}`)] : []),
      '',
      ...(sections.sources ? ['SOURCES:', ...brief.sources.map((s) => `• ${s}`)] : []),
      '----------------------------------------',
      `AI-Assisted summary · ${patientConfirmed ? 'Reviewed by patient' : 'Awaiting patient review'} · For clinical consultation`,
    ];

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    showToast('Copied full clinician brief to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brief-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="glass-panel flex flex-col h-[90vh] w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-[#d6ded5] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e7e0] px-6 py-4 bg-[#f8f9f5]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#14382f] text-[#3eb4a4] shadow-xs">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-xs font-bold text-[#14382f]">
                  AI CLINICAL BRIEF
                </span>
                <span className="text-xs text-[#6e7771]">30-Second Consult Synthesis</span>
              </div>
              <h2 id="brief-modal-title" className="text-lg font-bold tracking-tight text-[#14382f]">
                Clinician Brief Generator
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d6ded5] bg-white px-3 py-1.5 text-xs font-semibold text-[#14382f] hover:bg-[#f1f4ee] disabled:opacity-50 transition-all"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-xl p-1.5 text-[#6e7771] hover:bg-[#f1f4ee] hover:text-[#14382f] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Section Toggles & Recipient Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e7e0] bg-white px-6 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#14382f]">Recipient:</span>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="rounded-lg border border-[#d6ded5] px-2.5 py-1 text-xs text-[#1c2420] focus:border-[#2b8a7e] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#525d56]">
            <span className="font-medium">Sections:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.conditions}
                onChange={(e) => setSections({ ...sections, conditions: e.target.checked })}
                className="rounded border-[#d6ded5] text-[#2b8a7e]"
              />
              <span>Conditions</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.currentMeds}
                onChange={(e) => setSections({ ...sections, currentMeds: e.target.checked })}
                className="rounded border-[#d6ded5] text-[#2b8a7e]"
              />
              <span>Meds</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.allergies}
                onChange={(e) => setSections({ ...sections, allergies: e.target.checked })}
                className="rounded border-[#d6ded5] text-[#2b8a7e]"
              />
              <span>Allergies</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.labs}
                onChange={(e) => setSections({ ...sections, labs: e.target.checked })}
                className="rounded border-[#d6ded5] text-[#2b8a7e]"
              />
              <span>Labs</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.conflicts}
                onChange={(e) => setSections({ ...sections, conflicts: e.target.checked })}
                className="rounded border-[#d6ded5] text-[#2b8a7e]"
              />
              <span>Conflicts</span>
            </label>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#f8f9f5]">
          {isGenerating ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#2b8a7e]" />
              <p className="text-sm font-medium text-[#14382f]">Compiling 8-section clinician brief...</p>
              <p className="text-xs text-[#6e7771]">Preserving exact lab units and distinguishing historical medications</p>
            </div>
          ) : brief ? (
            <div className="glass-panel rounded-2xl bg-white p-6 shadow-xs space-y-6 border border-[#d6ded5]">
              {/* 1. Profile */}
              {sections.profile && (
                <div className="space-y-1.5 pb-4 border-b border-[#e2e7e0]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2b8a7e]">
                    1. Patient Profile
                  </h3>
                  <p className="text-sm font-medium text-[#1c2420]">{brief.patientProfile}</p>
                </div>
              )}

              {/* 2. Active Conditions */}
              {sections.conditions && (
                <div className="space-y-2 pb-4 border-b border-[#e2e7e0]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2b8a7e]">
                    2. Documented Active Conditions
                  </h3>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {brief.activeConditions.map((c, i) => (
                      <div key={i} className="rounded-xl bg-[#f8f9f5] p-2.5 text-xs text-[#14382f] font-medium border border-[#e2e7e0]">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Current & Historical Medications */}
              {sections.currentMeds && (
                <div className="space-y-4 pb-4 border-b border-[#e2e7e0]">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#2b8a7e]">
                      3. Current Active Medications
                    </h3>
                    <div className="space-y-1.5">
                      {brief.currentMedications.map((m, i) => (
                        <div key={i} className="rounded-xl bg-[#ddf2e8]/40 p-2.5 text-xs text-[#14382f] border border-[#ccebe0]">
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>

                  {sections.historicalMeds && brief.historicalMedications.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e7771]">
                        Historical / Discontinued Medications
                      </h4>
                      <div className="space-y-1.5">
                        {brief.historicalMedications.map((m, i) => (
                          <div key={i} className="rounded-xl bg-[#f1f4ee] p-2 text-xs text-[#525d56] border border-[#d6ded5] line-through decoration-[#a1aba4]">
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Allergies & Reactions */}
              {sections.allergies && (
                <div className="space-y-2 pb-4 border-b border-[#e2e7e0]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    4. Documented Allergies &amp; Adverse Reactions
                  </h3>
                  <div className="space-y-1.5">
                    {brief.allergiesAndReactions.map((a, i) => (
                      <div key={i} className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-950 font-medium border border-rose-200">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Recent Lab Results */}
              {sections.labs && (
                <div className="space-y-2 pb-4 border-b border-[#e2e7e0]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2b8a7e]">
                    5. Recent Laboratory Results (Exact Values &amp; Units)
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {brief.recentLabResults.map((l, i) => (
                      <div key={i} className="rounded-xl bg-[#f8f9f5] p-2.5 text-xs text-[#1c2420] border border-[#e2e7e0]">
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Procedures & Care Events */}
              {sections.events && brief.proceduresAndCareEvents.length > 0 && (
                <div className="space-y-2 pb-4 border-b border-[#e2e7e0]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2b8a7e]">
                    6. Procedures &amp; Care Encounters
                  </h3>
                  <div className="space-y-1.5">
                    {brief.proceduresAndCareEvents.map((e, i) => (
                      <div key={i} className="rounded-xl bg-[#f8f9f5] p-2.5 text-xs text-[#1c2420] border border-[#e2e7e0]">
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Clinical Conflicts & Unverified Information */}
              {sections.conflicts && brief.conflictsAndUnverifiedInfo.length > 0 && (
                <div className="space-y-2 pb-4 border-b border-[#e2e7e0]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>7. Missing, Conflicting or Unverified Information</span>
                  </h3>
                  <div className="space-y-2">
                    {brief.conflictsAndUnverifiedInfo.map((ci, i) => (
                      <div key={i} className="rounded-xl bg-amber-50 p-3 text-xs text-amber-950 border border-amber-200 leading-relaxed">
                        {ci}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. Sources */}
              {sections.sources && (
                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6e7771]">
                    8. Supporting Source Documents
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#525d56] space-y-0.5">
                    {brief.sources.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e2e7e0] bg-white px-6 py-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#14382f]">
            <input
              type="checkbox"
              checked={patientConfirmed}
              onChange={(e) => setPatientConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-[#d6ded5] text-[#2b8a7e] focus:ring-[#2b8a7e]"
            />
            <span className="font-medium">
              I have reviewed this brief and confirm it accurately reflects my health records.
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d6ded5] bg-white px-3.5 py-2 text-xs font-semibold text-[#14382f] hover:bg-[#f1f4ee] transition-all"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied' : 'Copy Brief'}</span>
            </button>

            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d6ded5] bg-white px-3.5 py-2 text-xs font-semibold text-[#14382f] hover:bg-[#f1f4ee] transition-all"
            >
              <Printer className="h-4 w-4 text-[#2b8a7e]" />
              <span>Print / PDF</span>
            </button>

            {onNavigateToShare && (
              <button
                type="button"
                disabled={!patientConfirmed}
                onClick={() => {
                  onClose();
                  onNavigateToShare();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#14382f] px-4 py-2 text-xs font-semibold text-[#ddf2e8] shadow-sm hover:bg-[#1a473c] disabled:opacity-50 transition-all"
              >
                <Share2 className="h-4 w-4 text-[#3eb4a4]" />
                <span>Share Encrypted Brief</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
