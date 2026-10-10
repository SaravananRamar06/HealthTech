'use client';

import { DialogFocus } from '@/components/ui/DialogFocus';

import { useState } from 'react';
import { ShieldCheck, Cpu, Cloud, Check, X } from 'lucide-react';

interface AIConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (provider: 'gemini' | 'local') => void;
  currentMode: 'gemini' | 'local';
}

export function AIConsentModal({
  isOpen,
  onClose,
  onConsent,
  currentMode,
}: AIConsentModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'local'>(currentMode);
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onConsent(selectedProvider);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <DialogFocus onClose={onClose} />
      <div className="glass-panel modal-surface w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 bg-white border border-[var(--border-card)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-[color:var(--brand-ink)]">
              <ShieldCheck className="h-6 w-6 text-[color:var(--teal-text)]" />
            </div>
            <div>
              <h2 id="ai-consent-title" className="text-xl font-bold tracking-tight text-[color:var(--brand-ink)]">
                AI Intelligence &amp; Privacy Boundary
              </h2>
              <p className="text-[13px] text-[color:var(--muted-grey)]">Control how your clinical data is processed</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-[color:var(--muted-grey)] hover:bg-[var(--surface-muted)] hover:text-[color:var(--brand-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Privacy Boundary Disclosure */}
        <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 text-[13px] text-[color:var(--brand-ink)] space-y-2">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[color:var(--teal-text)]" />
            <span>Handover privacy architecture</span>
          </p>
          <p className="text-[color:var(--brand-ink)] leading-relaxed">
            Your primary health vault is stored client-side in your device&apos;s browser. We never silently transmit decrypted medical records to external services.
          </p>
        </div>

        {/* Provider Selection */}
        <div className="space-y-3">
          <p className="text-[13px] font-bold text-[color:var(--brand-ink)] uppercase tracking-wider">
            Choose Your Processing Mode:
          </p>

          {/* Option A: Cloud Gemini */}
          <label
            className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
              selectedProvider === 'gemini'
                ? 'border-[var(--teal-text)] bg-[var(--surface-muted)] shadow-2xs'
                : 'border-[var(--border-card)] bg-white hover:bg-[var(--background)]'
            }`}
          >
            <input
              type="radio"
              name="ai-provider"
              value="gemini"
              checked={selectedProvider === 'gemini'}
              onChange={() => setSelectedProvider('gemini')}
              className="mt-1 h-4 w-4 text-[color:var(--teal-text)] focus:ring-[var(--teal-text)]"
            />
            <div className="space-y-1 text-[13px]">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-[color:var(--teal-text)]" />
                <span className="font-bold text-[color:var(--brand-ink)]">Google Gemini AI (Recommended)</span>
                <span className="rounded bg-[var(--mint-100)] px-2 py-0.5 text-[12px] font-bold text-[color:var(--brand-ink)]">
                  Enhanced
                </span>
              </div>
              <p className="text-[color:var(--muted-grey)] leading-relaxed">
                Sends the synthetic record to our server, which sends relevant records to Google Gemini for question answering and brief generation. On the free tier, Google may use inputs and outputs to improve its products, and human reviewers may read them. Do not use real medical records.
              </p>
            </div>
          </label>

          {/* Option B: Local Deterministic */}
          <label
            className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
              selectedProvider === 'local'
                ? 'border-[var(--teal-text)] bg-[var(--surface-muted)] shadow-2xs'
                : 'border-[var(--border-card)] bg-white hover:bg-[var(--background)]'
            }`}
          >
            <input
              type="radio"
              name="ai-provider"
              value="local"
              checked={selectedProvider === 'local'}
              onChange={() => setSelectedProvider('local')}
              className="mt-1 h-4 w-4 text-[color:var(--teal-text)] focus:ring-[var(--teal-text)]"
            />
            <div className="space-y-1 text-[13px]">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[color:var(--teal-text)]" />
                <span className="font-bold text-[color:var(--brand-ink)]">Local Deterministic Mode</span>
                <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[12px] font-bold text-[color:var(--muted-grey)]">
                  100% Offline
                </span>
              </div>
              <p className="text-[color:var(--muted-grey)] leading-relaxed">
                Zero network transmission to AI services. Generates grounded responses, clinical briefs, and reconciliation alerts purely from structured code on your device.
              </p>
            </div>
          </label>
        </div>

        {/* Explicit Consent Checkbox */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-[13px] text-amber-950">
          <input
            id="ai-consent-checkbox"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[color:var(--teal-text)] focus:ring-[var(--teal-text)]"
          />
          <label htmlFor="ai-consent-checkbox" className="leading-relaxed cursor-pointer">
            I understand this prototype uses synthetic data only. If I select Gemini, I consent to processing by Google Gemini. Model output requires patient review.
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-card)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-card)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[color:var(--muted-grey)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedProvider === 'gemini' && !agreed}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--forest-800)] px-5 py-2.5 text-[13px] font-semibold text-[#e4eee5] shadow-sm hover:bg-[var(--forest-700)] disabled:opacity-50 transition-colors"
          >
            <Check className="h-4 w-4 text-[#8ccab5]" />
            <span>Apply Processing Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
