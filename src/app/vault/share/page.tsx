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
      <main className="mx-auto flex min-h-[50vh] max-w-4xl items-center justify-center p-6">
        <p className="text-sm text-zinc-500">Loading share wizard...</p>
      </main>
    );
  }

  const currentRecord = record;

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
      alert('Please load or create a health record first.');
      return;
    }
    if (!recipient.trim()) {
      alert('Please enter a recipient name or label.');
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
    } catch (err) {
      console.error('Error generating share:', err);
      alert('Error encrypting and creating share link. Please try again.');
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
      } else {
        alert('Could not revoke share on server.');
      }
    } catch (err) {
      console.error('Error revoking share:', err);
      alert('Network error while revoking share.');
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

  const hasExcludedMedicines = currentRecord?.medications?.some((m) =>
    excludedIds.includes(m.id)
  );

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/vault" className="text-xs text-zinc-500 hover:text-zinc-800">
              ← Return to Vault
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              CLIENT-SIDE ENCRYPTION
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Share Health Brief
          </h1>
          <p className="text-xs text-zinc-500">
            Encrypted with AES-256-GCM in your browser. The server stores only ciphertext and never receives the key.
          </p>
        </div>

        {!currentRecord && (
          <button
            type="button"
            onClick={() => loadDemo('complete')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            Load Demo Patient
          </button>
        )}
      </div>

      {/* Share Creator Wizard */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-zinc-900">Create Scoped Share Link</h2>

        {/* 1. Recipient & Expiry */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1">
              Recipient Name or Clinician Label
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Dr. S. Rao (Endocrinology)"
              className="w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1">
              Link Expiry Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['1h', '24h', '7d'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setExpiryOption(opt)}
                  className={`rounded-lg py-2 text-xs font-medium border transition-colors ${
                    expiryOption === opt
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {opt === '1h' ? '1 Hour' : opt === '24h' ? '24 Hours (Default)' : '7 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Section Inclusions */}
        <div>
          <label className="text-xs font-semibold text-zinc-700 block mb-2">
            Select Sections to Include in Share
          </label>
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
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
          <div className="border-t border-zinc-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 block">
                Exclude Specific Items (Optional)
              </label>
              <span className="text-[11px] text-zinc-400">
                {excludedIds.length} item(s) selected to withhold
              </span>
            </div>

            {hasExcludedMedicines && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                ⚠️ <strong>Clinical Safety Notice:</strong> You have withheld one or more medications.
                Hiding active prescriptions may affect clinician safety decisions.
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-zinc-200 p-2.5 bg-zinc-50/50">
              {currentRecord.medications?.map((m) => {
                const isExcluded = excludedIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center justify-between gap-2 p-1.5 rounded bg-white border border-zinc-100 text-xs cursor-pointer hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isExcluded}
                        onChange={() => toggleExcludedId(m.id)}
                        className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={isExcluded ? 'line-through text-zinc-400' : 'text-zinc-800'}>
                        {m.name} ({m.dosage || 'dose unspecified'})
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 uppercase">Medication</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isEncrypting || !currentRecord}
            onClick={handleCreateShare}
            className="w-full sm:w-auto rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isEncrypting ? 'Encrypting with AES-256-GCM...' : 'Generate Encrypted Link & QR Code'}
          </button>
        </div>

        {/* Generated Share Display */}
        {createdShare && (
          <div className="rounded-xl border-2 border-indigo-500 bg-indigo-50/30 p-5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-900">
              <span className="text-lg">🔒</span>
              <h3 className="font-bold text-sm">Encrypted Share Ready!</h3>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              The decryption key exists solely in the URL fragment below (after the <code>#k=</code>).
              Our server cannot read this summary.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* QR Code */}
              <div className="rounded-xl bg-white p-3 border border-zinc-200 shadow-xs shrink-0">
                <QRCodeSVG value={createdShare.url} size={150} level="M" />
              </div>

              {/* Link Box */}
              <div className="space-y-2 w-full">
                <label className="text-[11px] font-semibold text-zinc-500 block">Clinician URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdShare.url}
                    className="w-full rounded-lg border border-zinc-300 bg-white p-2 font-mono text-[11px] text-zinc-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdShare.url);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 shrink-0 transition-colors"
                  >
                    {copySuccess ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>

                <div className="text-[11px] text-zinc-500 space-y-0.5">
                  <p>Expires: {new Date(createdShare.expiresAt).toLocaleString()}</p>
                  {createdShare.withheldCount > 0 && (
                    <p className="text-amber-700 font-medium">
                      Notice: {createdShare.withheldCount} item(s) withheld from this brief.
                    </p>
                  )}
                </div>

                <div className="pt-1">
                  <a
                    href={createdShare.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Test Clinician View in New Tab →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Active & Revocable Shares List */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-zinc-900">Manage Active Shares ({shares.length})</h2>

        {shares.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-2">
            No shares created yet. Generate a link above to share with your clinician.
          </p>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => {
              const isRevoked = Boolean(share.revokedAt);
              const logs = accessLogs[share.id] || [];

              return (
                <div
                  key={share.id}
                  className={`rounded-lg border p-4 text-xs space-y-3 transition-colors ${
                    isRevoked
                      ? 'border-rose-200 bg-rose-50/40 opacity-75'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">{share.recipientLabel}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            isRevoked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isRevoked ? 'Revoked' : 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Created {new Date(share.createdAt).toLocaleDateString()} · Expires{' '}
                        {new Date(share.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {share.withheldCount > 0 ? ` · ${share.withheldCount} withheld` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleFetchAccessLog(share)}
                        disabled={loadingLogId === share.id}
                        className="rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        {loadingLogId === share.id ? 'Loading...' : 'View Access Log'}
                      </button>

                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(share)}
                          className="rounded border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          Revoke Access
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Access Log Details */}
                  {logs.length > 0 && (
                    <div className="rounded border border-zinc-100 bg-zinc-50 p-2.5 text-[11px] space-y-1">
                      <span className="font-semibold text-zinc-600 block">Access Log:</span>
                      {logs.map((ev, i) => (
                        <p key={i} className="text-zinc-500">
                          • Opened at <strong>{new Date(ev.at).toLocaleTimeString()}</strong> ({ev.ua})
                        </p>
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
