'use client';

import { DialogFocus } from '@/components/ui/DialogFocus';

import { useState } from 'react';
import type { PatientRecord, AppointmentPrepSheet } from '@/lib/types';
import {
  Calendar,
  X,
  Printer,
  Copy,
  Check,
  Trash2,
  Sparkles,
  AlertCircle,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { generateDeterministicAppointmentPrep } from '@/lib/ai/appointmentPrep';

interface AppointmentPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PatientRecord;
  aiMode: 'gemini' | 'local';
}

const COMMON_SYMPTOM_TAGS = [
  'Morning blood sugar elevation',
  'Post-meal lethargy',
  'Occasional lightheadedness',
  'Fatigue / low energy',
  'Joint stiffness',
  'Digestive discomfort',
];

export function AppointmentPrepModal({
  isOpen,
  onClose,
  record,
  aiMode,
}: AppointmentPrepModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [purpose, setPurpose] = useState('Endocrinology follow-up with Dr. S. Rao');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prepSheet, setPrepSheet] = useState<AppointmentPrepSheet | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleToggleSymptom = (tag: string) => {
    if (selectedSymptoms.includes(tag)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== tag));
    } else {
      setSelectedSymptoms([...selectedSymptoms, tag]);
    }
  };

  const handleAddCustomSymptom = () => {
    if (!customSymptom.trim()) return;
    setSelectedSymptoms([...selectedSymptoms, customSymptom.trim()]);
    setCustomSymptom('');
  };

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setCustomQuestions([...customQuestions, newQuestion.trim()]);
    setNewQuestion('');
  };

  const handleRemoveQuestion = (idx: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== idx));
  };

  const handleGenerateSheet = async () => {
    setIsGenerating(true);
    try {
      if (aiMode === 'local') {
        setPrepSheet(generateDeterministicAppointmentPrep(record, {
          purpose,
          symptoms: selectedSymptoms,
          customQuestions,
        }));
        setStep(2);
        return;
      }
      const res = await fetch('/api/ai/appointment-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record,
          purpose,
          symptoms: selectedSymptoms,
          customQuestions,
          consented: aiMode === 'gemini',
          forceDeterministic: false,
        }),
      });

      if (!res.ok) {
        throw new Error('Appointment prep API error');
      }

      const data = await res.json();
      setPrepSheet(data.sheet);
      setStep(2);
    } catch {
      setPrepSheet(
        generateDeterministicAppointmentPrep(record, {
          purpose,
          symptoms: selectedSymptoms,
          customQuestions,
        })
      );
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!prepSheet) return;
    const lines = [
      `APPOINTMENT PREPARATION SHEET — ${record.profile.name}`,
      `Purpose: ${prepSheet.appointmentPurpose}`,
      `Created: ${new Date().toLocaleDateString()}`,
      '--------------------------------------------------',
      `PATIENT-REPORTED SYMPTOMS & RECENT CONCERNS:`,
      ...prepSheet.patientReportedSymptoms.map((s) => `• ${s}`),
      '',
      `QUESTIONS FOR THE DOCTOR:`,
      ...prepSheet.questionsToAsk.map((q) => `• ${q}`),
      '',
      `RELEVANT DOCUMENTED HISTORY:`,
      ...prepSheet.relevantDocumentedHistory.map((h) => `• ${h}`),
      '',
      `CURRENT MEDICATIONS:`,
      ...prepSheet.selectedMedications.map((m) => `• ${m}`),
      '',
      `ALLERGIES:`,
      ...prepSheet.selectedAllergies.map((a) => `• ${a}`),
      '',
      `RECENT LAB RESULTS:`,
      ...prepSheet.relevantHistoricalLabs.map((l) => `• ${l}`),
      '',
      `POINTS FOR CLARIFICATION:`,
      ...prepSheet.clarificationItems.map((ci) => `• ${ci}`),
      '--------------------------------------------------',
      'Patient preparation sheet · Patient-reported concerns separated from documented records',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    showToast('Copied appointment preparation sheet', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prep-modal-title"
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <DialogFocus onClose={onClose} />
      <div className="glass-panel modal-surface flex flex-col h-[88vh] w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-[var(--border-card)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-card)] px-6 py-4 bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--forest-800)] text-[#8ccab5] shadow-xs">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[13px] font-bold text-[color:var(--brand-ink)]">
                  APPOINTMENT ASSISTANT
                </span>
                <span className="text-[13px] text-[color:var(--muted-grey)]">Step {step} of 2</span>
              </div>
              <h2 id="prep-modal-title" className="text-lg font-bold tracking-tight text-[color:var(--brand-ink)]">
                {step === 1 ? 'Prepare for Your Consultation' : 'Your Appointment Preparation Sheet'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-1.5 text-[color:var(--muted-grey)] hover:bg-[var(--surface-muted)] hover:text-[color:var(--brand-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div tabIndex={0} role="region" aria-label="Appointment preparation content" className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--background)]">
          {step === 1 ? (
            /* Step 1: Input Purpose, Symptoms, Questions */
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Purpose */}
              <div className="space-y-1.5">
                <label htmlFor="ai-AppointmentPrepModal-field-1" className="text-[13px] font-bold text-[color:var(--brand-ink)] uppercase tracking-wider">
                  Appointment Purpose &amp; Clinician
                </label>
                <input id="ai-AppointmentPrepModal-field-1"
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Follow-up with Dr. S. Rao (Endocrinology)"
                  className="w-full rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2.5 text-[13px] text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-hidden"
                />
              </div>

              {/* Symptoms & Concerns (Patient-Reported) */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[color:var(--brand-ink)] uppercase tracking-wider">
                  Patient-Reported Symptoms &amp; Concerns
                </label>
                <p className="text-[12px] text-[color:var(--muted-grey)]">
                  Tap common concerns or add your own. These are clearly labelled as patient-reported.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_SYMPTOM_TAGS.map((tag) => {
                    const isSelected = selectedSymptoms.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleSymptom(tag)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[var(--forest-800)] text-[#e4eee5] shadow-2xs'
                            : 'bg-white border border-[var(--border-card)] text-[color:var(--muted-grey)] hover:bg-[var(--surface-muted)]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={customSymptom}
                    onChange={(e) => setCustomSymptom(e.target.value)}
                    placeholder="Add other symptom or concern..."
                    className="flex-1 rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[13px] text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSymptom}
                    className="rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[13px] font-semibold text-[color:var(--brand-ink)] hover:bg-[var(--surface-muted)] transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Questions for the Clinician */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[color:var(--brand-ink)] uppercase tracking-wider">
                  Questions You Want to Ask
                </label>
                <div className="space-y-1.5">
                  {customQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-card)] bg-white p-2.5 text-[13px] text-[color:var(--brand-ink)]"
                    >
                      <span>{q}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-[color:var(--muted-grey)] hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Add a question for the doctor..."
                    className="flex-1 rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[13px] text-[color:var(--brand-ink)] focus:border-[var(--teal-text)] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[13px] font-semibold text-[color:var(--brand-ink)] hover:bg-[var(--surface-muted)] transition-colors"
                  >
                    Add Question
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Generated Sheet Preview */
            prepSheet && (
              <div className="glass-panel rounded-2xl bg-white p-6 shadow-xs space-y-6 border border-[var(--border-card)]">
                <div className="pb-4 border-b border-[var(--border-card)]">
                  <h3 className="text-sm font-bold text-[color:var(--brand-ink)]">
                    Appointment: {prepSheet.appointmentPurpose}
                  </h3>
                  <p className="text-[13px] text-[color:var(--muted-grey)]">Prepared for: {record.profile.name} · {new Date().toLocaleDateString()}</p>
                </div>

                {/* Patient-Reported Symptoms */}
                {prepSheet.patientReportedSymptoms.length > 0 && (
                  <div className="space-y-2 pb-4 border-b border-[var(--border-card)]">
                    <h4 className="text-[13px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-amber-700" />
                      <span>Patient-Reported Symptoms &amp; Concerns</span>
                    </h4>
                    <ul className="list-disc list-inside text-[13px] text-[color:var(--brand-ink)] space-y-1">
                      {prepSheet.patientReportedSymptoms.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Questions for Doctor */}
                <div className="space-y-2 pb-4 border-b border-[var(--border-card)]">
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-[color:var(--teal-text)] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[color:var(--teal-text)]" />
                    <span>Targeted Questions to Ask</span>
                  </h4>
                  <div className="space-y-1.5">
                    {prepSheet.questionsToAsk.map((q, i) => (
                      <div key={i} className="rounded-xl bg-[var(--mint-100)]/40 p-2.5 text-[13px] text-[color:var(--brand-ink)] font-medium border border-[var(--border-strong)]">
                        &ldquo;{q}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documented History & Meds Summary */}
                <div className="grid gap-4 sm:grid-cols-2 pb-4 border-b border-[var(--border-card)]">
                  <div className="space-y-2">
                    <h4 className="text-[13px] font-bold uppercase tracking-wider text-[color:var(--muted-grey)]">
                      Current Medications on File
                    </h4>
                    <div className="space-y-1 text-[13px] text-[color:var(--brand-ink)]">
                      {prepSheet.selectedMedications.map((m, i) => (
                        <p key={i} className="truncate">• {m}</p>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[13px] font-bold uppercase tracking-wider text-[color:var(--muted-grey)]">
                      Recent Labs to Discuss
                    </h4>
                    <div className="space-y-1 text-[13px] text-[color:var(--brand-ink)]">
                      {prepSheet.relevantHistoricalLabs.map((l, i) => (
                        <p key={i} className="truncate">• {l}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clarification Items */}
                {prepSheet.clarificationItems.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-950 border border-amber-200 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                      <span>Items Needing Doctor Clarification:</span>
                    </p>
                    {prepSheet.clarificationItems.map((ci, i) => (
                      <p key={i} className="text-[12px] leading-relaxed">• {ci}</p>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-card)] bg-white px-6 py-4">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-[var(--border-card)] bg-white px-4 py-2 text-[13px] font-semibold text-[color:var(--muted-grey)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              Back to Edit
            </button>
          ) : (
            <div className="text-[13px] text-[color:var(--muted-grey)]">
              Patient-reported concerns are kept strictly distinct from documented facts.
            </div>
          )}

          <div className="flex items-center gap-2">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleGenerateSheet}
                disabled={isGenerating || !purpose.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--forest-800)] px-5 py-2.5 text-[13px] font-semibold text-[#e4eee5] shadow-sm hover:bg-[var(--forest-700)] disabled:opacity-50 transition-colors"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#8ccab5]" />}
                <span>Generate Preparation Sheet</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-card)] bg-white px-3.5 py-2 text-[13px] font-semibold text-[color:var(--brand-ink)] hover:bg-[var(--surface-muted)] transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied' : 'Copy Sheet'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => typeof window !== 'undefined' && window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--forest-800)] px-4 py-2 text-[13px] font-semibold text-[#e4eee5] shadow-sm hover:bg-[var(--forest-700)] transition-colors"
                >
                  <Printer className="h-4 w-4 text-[#8ccab5]" />
                  <span>Print / Save PDF</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
