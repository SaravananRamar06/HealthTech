'use client';

// Owner: P3. Scoped, expiring, revocable share wizard & active shares management
// In-browser AES-256-GCM encryption with decryption key ONLY in the URL #fragment.

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useVault } from '@/lib/vault';
import { useIsMounted } from '@/lib/useIsMounted';
import { buildSharePayload } from '@/lib/share/payload';
import { encryptPayload } from '@/lib/share/crypto';
import type {
  AccessEvent,
  ShareRecord,
  ShareSection,
  ShareSelection,
} from '@/lib/types';
import {
  Lock,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Eye,
  Trash2,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

function getSharesSnapshot(): string {
  if (typeof window === 'undefined') return '[]';
  try {
    return localStorage.getItem('handover-shares') || '[]';
  } catch {
    return '[]';
  }
}

function useStoredShares(): [ShareRecord[], (updated: ShareRecord[]) => void] {
  const raw = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('storage', onStoreChange);
      window.addEventListener('handover-shares-change', onStoreChange);
      return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener('handover-shares-change', onStoreChange);
      };
    },
    getSharesSnapshot,
    () => '[]'
  );

  let shares: ShareRecord[] = [];
  try {
    shares = JSON.parse(raw);
  } catch {
    shares = [];
  }

  const saveShares = (updated: ShareRecord[]) => {
    try {
      localStorage.setItem('handover-shares', JSON.stringify(updated));
      window.dispatchEvent(new Event('handover-shares-change'));
    } catch (e) {
      console.warn('Could not write shares:', e);
    }
  };

  return [shares, saveShares];
}

export default function SharePage() {
  const mounted = useIsMounted();
  const { showToast } = useToast();
  const { record, loadDemo } = useVault();
  const [shares, saveShares] = useStoredShares();

  // Wizard state
  const [recipient, setRecipient] = useState('Dr. S. Rao (Endocrinology)');
  const [expiryOption, setExpiryOption] = useState<'1h' | '24h' | '7d'>('24h');
  const [selectedSections, setSelectedSections] = useState<ShareSection[]>([
    'allergies',
    'conditions',
    'medications',
    'labs',
    'events',
    'emergencyContact',
  ]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [createdShare, setCreatedShare] = useState<{
    id: string;
    url: string;
    expiresAt: string;
    withheldCount: number;
  } | null>(null);

  const [accessLogs, setAccessLogs] = useState<Record<string, AccessEvent[]>>({});
  const [loadingLogId, setLoadingLogId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#14382f] border-t-transparent" />
          <p className="text-sm font-medium text-[#525d56]">Loading share studio...</p>
        </div>
      </main>
    );
  }

  const currentRecord = record;
  // Synthetic preview date only; share creation uses the actual time in its event handler.
  const previewDate = new Date('2026-10-10T00:00:00Z');

  function toggleSection(sec: ShareSection) {
    if (selectedSections.includes(sec)) {
      setSelectedSections(selectedSections.filter((s) => s !== sec));
    } else {
      setSelectedSections([...selectedSections, sec]);
    }
  }

  function toggleExcludedId(id: string) {
    if (excludedIds.includes(id)) {
      setExcludedIds(excludedIds.filter((i) => i !== id));
    } else {
      setExcludedIds([...excludedIds, id]);
    }
  }

  async function handleCreateShare() {
    if (!currentRecord) {
      showToast('Please load or create a health record first', 'error');
      return;
    }
    if (!recipient.trim()) {
      showToast('Please enter a recipient name or clinician label', 'error');
      return;
    }

    setIsEncrypting(true);
    setCreatedShare(null);

    try {
      // 1. Calculate expiry timestamp
      const now = new Date();
      let expiryHours = 24;
      if (expiryOption === '1h') expiryHours = 1;
      if (expiryOption === '7d') expiryHours = 168;

      const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000).toISOString();

      // 2. Build scoped SharePayload
      const selection: ShareSelection = {
        sections: selectedSections,
        excludedIds,
        recipientLabel: recipient.trim(),
        expiresAt,
      };

      const payload = buildSharePayload(currentRecord, selection, now);

      // 3. Encrypt in browser with AES-256-GCM
      const { ciphertext, iv, keyBase64Url } = await encryptPayload(payload);

      // 4. Send ciphertext and iv to server (key is NOT sent)
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext,
          iv,
          expiresAt,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to register share on server');
      }

      const { id, manageToken } = await res.json();

      // 5. Construct URL with key in hash fragment
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${origin}/s/${id}#k=${keyBase64Url}`;

      const newShareRecord: ShareRecord = {
        id,
        manageToken,
        url: fullUrl,
        recipientLabel: recipient.trim(),
        createdAt: now.toISOString(),
        expiresAt,
        sections: selectedSections,
        withheldCount: payload.withheldCount,
        revokedAt: null,
      };

      saveShares([newShareRecord, ...shares]);

      setCreatedShare({
        id,
        url: fullUrl,
        expiresAt,
        withheldCount: payload.withheldCount,
      });

      showToast('Share brief generated & encrypted with AES-256-GCM', 'success');
    } catch (err) {
      console.error('Error generating share:', err);
      showToast('Error encrypting and creating share link', 'error');
    } finally {
      setIsEncrypting(false);
    }
  }

  async function handleRevoke(share: ShareRecord) {
    if (!confirm(`Revoke access for ${share.recipientLabel}? The ciphertext will be deleted from the server immediately.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/shares/${share.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${share.manageToken}`,
        },
      });

      if (res.ok || res.status === 204 || res.status === 410) {
        const updated = shares.map((s) =>
          s.id === share.id ? { ...s, revokedAt: new Date().toISOString() } : s
        );
        saveShares(updated);
        showToast(`Revoked access for ${share.recipientLabel}`, 'info');
      } else {
        showToast('Could not revoke share on server', 'error');
      }
    } catch (err) {
      console.error('Error revoking share:', err);
      showToast('Network error while revoking share', 'error');
    }
  }

  async function handleFetchAccessLog(share: ShareRecord) {
    setLoadingLogId(share.id);
    try {
      const res = await fetch(`/api/shares/${share.id}/access`, {
        headers: {
          Authorization: `Bearer ${share.manageToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAccessLogs((prev) => ({ ...prev, [share.id]: data.events || [] }));
      }
    } catch (err) {
      console.error('Error fetching access log:', err);
    } finally {
      setLoadingLogId(null);
    }
  }

  const hasExcludedMedicines = currentRecord?.medications?.some((m) => !selectedSections.includes('medications') || excludedIds.includes(m.id));
  const preview = currentRecord ? buildSharePayload(currentRecord, {
    sections: selectedSections, excludedIds, recipientLabel: recipient,
    expiresAt: new Date(previewDate.getTime() + 3_600_000).toISOString(),
  }, previewDate) : null;
  const withholdingItems = currentRecord ? [
    ...currentRecord.medications.map((m) => ({ id: m.id, label: `${m.name} (${m.dosage || 'dose unspecified'})`, type: 'Medicine' })),
    ...currentRecord.allergies.map((a) => ({ id: a.id, label: a.substance, type: 'Allergy' })),
    ...currentRecord.conditions.map((c) => ({ id: c.id, label: c.name, type: 'Condition' })),
    ...currentRecord.labs.map((l) => ({ id: l.id, label: `${l.test}: ${l.value} ${l.unit} (${l.date})`, type: 'Lab' })),
    ...currentRecord.events.map((e) => ({ id: e.id, label: e.title, type: 'Event' })),
  ] : [];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/vault"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#525d56] hover:text-[#14382f] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Vault</span>
            </Link>
            <span className="text-[#ccebe0]">/</span>
            <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-xs font-bold text-[#14382f]">
              CLIENT-SIDE ENCRYPTION
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14382f]">
            Share Health Brief
          </h1>
          <p className="text-xs text-[#525d56] mt-0.5">
            Encrypted with AES-256-GCM in your browser. The server receives only ciphertext and never sees the key.
          </p>
        </div>

        {!currentRecord && (
          <button
            type="button"
            onClick={() => loadDemo('complete')}
            className="rounded-xl bg-[#14382f] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1a473c] transition-colors"
          >
            Load Demo Patient
          </button>
        )}
      </div>

      {/* Two Column Layout: Wizard + Live Clinician Preview */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Share Creator Wizard */}
        <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-5 lg:col-span-7">
          <h2 className="text-base font-bold text-[#14382f] flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#2b8a7e]" />
            <span>Configure Scoped Share</span>
          </h2>

          {/* 1. Recipient & Expiry */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#14382f] block mb-1">
                Recipient Name or Clinician Label
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Dr. S. Rao (Endocrinology)"
                className="w-full rounded-xl border border-[#d6ded5] bg-white p-2.5 text-xs text-[#1c2420] focus:border-[#2b8a7e] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#14382f] block mb-1.5">
                Link Expiry Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['1h', '24h', '7d'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setExpiryOption(opt)}
                    className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                      expiryOption === opt
                        ? 'border-[#14382f] bg-[#14382f] text-[#ddf2e8] shadow-xs'
                        : 'border-[#d6ded5] bg-white text-[#525d56] hover:bg-[#f1f4ee]'
                    }`}
                  >
                    {opt === '1h' ? '1 Hour' : opt === '24h' ? '24 Hours' : '7 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Section Inclusions */}
          <div className="space-y-2 pt-2 border-t border-[#eef2ec]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#14382f] block">
                Sections to Include ({selectedSections.length} of 6)
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedSections(['allergies', 'medications', 'conditions', 'labs', 'events', 'emergencyContact'])}
                  className="font-bold text-[#2b8a7e] hover:underline"
                >
                  Select All
                </button>
                <span className="text-[#d6ded5]">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedSections([])}
                  className="text-[#6e7771] hover:text-[#1c2420] hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'allergies', label: 'Allergies' },
                { id: 'medications', label: 'Medications' },
                { id: 'conditions', label: 'Conditions' },
                { id: 'labs', label: 'Lab Results' },
                { id: 'events', label: 'Care Events' },
                { id: 'emergencyContact', label: 'Emergency Contact' },
              ].map((sec) => {
                const active = selectedSections.includes(sec.id as ShareSection);
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => toggleSection(sec.id as ShareSection)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${
                      active
                        ? 'bg-[#14382f] border-[#14382f] text-white shadow-2xs'
                        : 'bg-white border-[#d6ded5] text-[#6e7771] hover:bg-[#f1f4ee]'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Granular Item Exclusions */}
          {currentRecord && (
            <div className="border-t border-[#eef2ec] pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#14382f] block">
                  Withhold Specific Items (Optional)
                </label>
                <span className="text-[11px] font-mono text-[#6e7771]">
                  {excludedIds.length} withheld
                </span>
              </div>

              {hasExcludedMedicines && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Clinical Safety Notice:</strong> You have withheld one or more medications. The clinician brief will clearly disclose that items were withheld.
                  </p>
                </div>
              )}

              <div className="max-h-44 overflow-y-auto space-y-1.5 rounded-xl border border-[#d6ded5] p-2 bg-[#f8f9f5]">
                {withholdingItems.map((m) => {
                  const isExcluded = excludedIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-[#e2e7e0] text-xs cursor-pointer hover:bg-[#f1f4ee] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isExcluded}
                          onChange={() => toggleExcludedId(m.id)}
                          className="rounded border-[#d6ded5] text-rose-600 focus:ring-rose-500"
                        />
                        <span className={isExcluded ? 'line-through text-[#859088]' : 'font-medium text-[#1c2420]'}>
                          {m.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6e7771] uppercase">{m.type}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="button"
            disabled={isEncrypting || !currentRecord}
            onClick={handleCreateShare}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#14382f] py-3.5 text-xs font-bold text-[#ddf2e8] shadow-sm hover:bg-[#1a473c] hover:shadow-md transition-all disabled:opacity-50"
          >
            <Lock className="h-4 w-4 text-[#3eb4a4]" />
            <span>
              {isEncrypting ? 'Encrypting with AES-256-GCM...' : 'Encrypt & Generate Share Link'}
            </span>
          </button>
        </section>

        {/* Right Column: Live Clinician View Preview (Sticky) */}
        <section className="glass-panel rounded-2xl p-5 shadow-xs space-y-4 lg:col-span-5 lg:sticky lg:top-20">
          <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#2b8a7e]" />
              <span className="text-xs font-bold text-[#14382f] uppercase tracking-wider">
                Live Brief Preview
              </span>
            </div>
            <span className="text-[10px] rounded bg-[#ddf2e8] px-2 py-0.5 font-bold text-[#14382f]">
              Recipient: {recipient.split(' ')[0] || 'Clinician'}
            </span>
          </div>

          {/* Mockup Frame */}
          <div className="rounded-xl border border-[#d6ded5] bg-white p-4 space-y-3.5 text-xs shadow-2xs">
            {/* Header info */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7771]">Patient</span>
              <p className="font-extrabold text-sm text-[#14382f]">{currentRecord?.profile.name || 'Patient Name'}</p>
              <p className="text-[11px] text-[#6e7771]">
                DOB: {currentRecord?.profile.dateOfBirth} · {currentRecord?.profile.sex}
                {selectedSections.includes('emergencyContact') && currentRecord?.profile.emergencyContact && (
                  <span> · Contact: {currentRecord.profile.emergencyContact.phone}</span>
                )}
              </p>
            </div>

            {/* Withheld notice */}
            {preview && preview.withheldCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 font-medium">
                ⚠️ {preview.withheldCount} item(s) withheld by patient from this summary.
              </div>
            )}

            {/* Sections realistic live preview */}
            <div className="space-y-3 border-t border-[#f1f4ee] pt-3">
              {/* Allergies live preview */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#14382f] mb-1">
                  <span>Allergies:</span>
                  <span className="text-[10px] text-[#6e7771]">
                    {selectedSections.includes('allergies') ? 'Included' : 'Withheld'}
                  </span>
                </div>
                {selectedSections.includes('allergies') ? (
                  preview && preview.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {preview.allergies.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800 border border-rose-200"
                        >
                          ⚠️ {a.substance} {a.reaction ? `(${a.reaction})` : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#6e7771] italic">{preview?.allergyStatus === 'none-known' ? 'No known allergies' : 'Allergy status unknown or withheld'}</span>
                  )
                ) : (
                  <span className="text-[10px] text-[#a0aaa3] italic">Allergies section excluded by patient</span>
                )}
              </div>

              {/* Medications live preview */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#14382f] mb-1">
                  <span>Current Medications:</span>
                  <span className="text-[10px] text-[#6e7771]">
                    {selectedSections.includes('medications') ? 'Included' : 'Withheld'}
                  </span>
                </div>
                {selectedSections.includes('medications') ? (
                  <div className="space-y-1">
                    {currentRecord?.medications
                      ?.filter((m) => m.status === 'active' && !excludedIds.includes(m.id))
                      .map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-md bg-[#f8f9f5] px-2 py-1 border border-[#e2e7e0] text-[10px]"
                        >
                          <span className="font-semibold text-[#14382f]">{m.name}</span>
                          <span className="text-[#6e7771]">{m.dosage || m.strength || 'Active'}</span>
                        </div>
                      ))}
                    {currentRecord?.medications?.filter((m) => m.status === 'active' && !excludedIds.includes(m.id)).length === 0 && (
                      <span className="text-[10px] text-[#6e7771] italic">No active medicines included</span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-[#a0aaa3] italic">Medications section excluded by patient</span>
                )}
              </div>

              {/* Lab trends live preview */}
              {selectedSections.includes('labs') && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#14382f] mb-1">
                    <span>Lab Results &amp; Trends:</span>
                    <span className="text-[10px] text-[#2b8a7e]">Included</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {preview?.labs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((lab) => (
                      <div key={lab.id} className="rounded-md bg-[#eef8f4] p-1.5 border border-[#cbe2da]">
                        <span className="text-[#6e7771] block">{lab.test} ({lab.date})</span>
                        <strong className="text-[#14382f] font-mono text-xs">{lab.value} {lab.unit}</strong>
                      </div>
                    ))}
                    {preview?.labs.length === 0 && <span>No lab results included</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-[#f8f9f5] p-2 text-[10px] text-[#6e7771] text-center border border-[#e2e7e0]">
              Scoped prior to encryption. Withheld items cannot leak into ciphertext.
            </div>
          </div>
        </section>
      </div>

      {/* Success Notification Card & QR Code Display */}
      {createdShare && (
        <section className="glass-panel-forest rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-in shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ddf2e8] text-[#14382f]">
              <Sparkles className="h-5 w-5 text-[#2b8a7e]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Share Brief Ready &amp; Encrypted</h2>
              <p className="text-xs text-[#ddf2e8]/80">
                AES-256-GCM encryption applied. The decryption key exists solely in the URL fragment (#k=).
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-12 items-center">
            {/* QR Code Presentation */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-5 shadow-xs sm:col-span-5">
              <QRCodeSVG
                value={createdShare.url}
                size={180}
                level="M"
                includeMargin
              />
              <p className="text-[11px] text-[#525d56] font-bold mt-2 text-center">
                Scan with clinician phone camera
              </p>
            </div>

            {/* Link details & Actions */}
            <div className="space-y-4 sm:col-span-7 text-xs">
              <div>
                <label className="text-xs font-bold text-[#ddf2e8] block mb-1">
                  Encrypted Share URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdShare.url}
                    className="w-full rounded-xl border border-[#2b8a7e]/50 bg-white/10 px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdShare.url);
                      setCopySuccess(true);
                      showToast('Share link copied to clipboard', 'success');
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#ddf2e8] px-3.5 py-2 text-xs font-bold text-[#14382f] hover:bg-white transition-colors shrink-0 shadow-2xs"
                  >
                    {copySuccess ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={createdShare.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#3eb4a4] px-4 py-2.5 text-xs font-bold text-[#0d2821] hover:bg-[#32998b] transition-colors shadow-2xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Brief as Clinician</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Active Shares Management Table */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
          <h2 className="text-base font-bold text-[#14382f] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#2b8a7e]" />
            <span>Active &amp; Past Share Links ({shares.length})</span>
          </h2>
          <span className="text-xs text-[#6e7771]">Track opens &amp; revoke access</span>
        </div>

        {shares.length === 0 ? (
          <p className="text-xs text-[#6e7771] italic py-4">No shares created yet.</p>
        ) : (
          <div className="space-y-3">
            {shares.map((s) => {
              const isRevoked = Boolean(s.revokedAt);
              const isExpired = new Date(s.expiresAt) < new Date();
              const logs = accessLogs[s.id] || [];

              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-[#e2e7e0] bg-[#f8f9f5] p-4 shadow-2xs space-y-3 transition-colors hover:border-[#b8c9bf]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-[#14382f] block">{s.recipientLabel}</span>
                      <p className="text-[11px] text-[#6e7771] mt-0.5">
                        Created: {new Date(s.createdAt).toLocaleDateString()} · Expiry:{' '}
                        {new Date(s.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {s.withheldCount > 0 && ` · ${s.withheldCount} item(s) withheld`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRevoked ? (
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                          Revoked
                        </span>
                      ) : isExpired ? (
                        <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-700">
                          Expired
                        </span>
                      ) : (
                        <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-xs font-bold text-[#14382f]">
                          Active
                        </span>
                      )}

                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Revoke</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleFetchAccessLog(s)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#d6ded5] bg-white px-2.5 py-1 text-xs font-semibold text-[#525d56] hover:bg-[#f1f4ee] transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{loadingLogId === s.id ? 'Checking...' : 'Audit Log'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Access log details */}
                  {logs.length > 0 && (
                    <div className="rounded-lg bg-white p-3 border border-[#e2e7e0] text-xs space-y-1">
                      <span className="font-bold text-[#14382f] block text-[11px]">Access History:</span>
                      {logs.map((e, idx) => (
                        <div key={idx} className="flex justify-between text-[#525d56] text-[11px]">
                          <span>{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className="font-mono text-[#859088] truncate max-w-xs">{e.ua}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
