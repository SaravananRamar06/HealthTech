'use client';

// Owner: P2. Document import & human-in-the-loop review queue
// Mandates patient/caregiver review before any fact enters the vault or can be shared.

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useVault } from '@/lib/vault';
import { useIsMounted } from '@/lib/useIsMounted';
import type { ExtractedItem, ExtractionResult, SourceDocument } from '@/lib/types';

export default function ImportPage() {
  const mounted = useIsMounted();
  const {
    record,
    loadDemo,
    addDocument,
    queueForReview,
    acceptItem,
    rejectItem,
  } = useVault();

  const [consentGiven, setConsentGiven] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, unknown>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center p-6">
        <p className="text-sm text-zinc-500">Loading import studio...</p>
      </main>
    );
  }

  // Handle uploading real or simulated files
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!consentGiven) {
      alert('Please check the AI processing consent checkbox before proceeding.');
      return;
    }

    // Ensure we have a record to attach to (load start if none)
    if (!record) {
      loadDemo('start');
    }

    setImporting(true);
    setStatusMessage(`Processing ${files.length} document(s)...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatusMessage(`Extracting facts from "${file.name}"...`);

        const formData = new FormData();
        formData.append('file', file);
        const docId = `doc_${Date.now()}_${i}`;
        formData.append('documentId', docId);

        const res = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          console.error(`Failed to extract ${file.name}`);
          continue;
        }

        const result: ExtractionResult = await res.json();

        // 1. Add document to record
        const sourceDoc: SourceDocument = {
          id: docId,
          title: result.document.title || file.name,
          docType: result.document.docType || 'other',
          date: result.document.date,
          facility: result.document.facility,
          clinician: result.document.clinician,
          fileRef: `idb:${docId}`,
        };

        await addDocument(sourceDoc, file);

        // 2. Queue extracted facts for review
        queueForReview(result.items);
      }
      setStatusMessage('Extraction complete! Please review each item below.');
    } catch (err) {
      console.error('Import error:', err);
      setStatusMessage('Error during extraction. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  // Load the 5 sample demo documents
  async function handleImportSampleDocuments() {
    if (!consentGiven) {
      alert('Please check the AI processing consent checkbox before proceeding.');
      return;
    }

    if (!record) {
      loadDemo('start');
    }

    setImporting(true);
    setStatusMessage('Importing 5 sample demo documents...');

    const sampleDocs = [
      { id: 'doc_01', name: 'Discharge Summary (Jan 2025)' },
      { id: 'doc_02', name: 'GP Prescription - Dr. A. Iyer (Mar 2026)' },
      { id: 'doc_03', name: 'Lab Report - Blood Tests (Apr 2026)' },
      { id: 'doc_04', name: 'Specialist Prescription - Dr. R. Menon (Jul 2026)' },
      { id: 'doc_05', name: 'Follow-up Lab Report (Sep 2026)' },
    ];

    try {
      for (const sample of sampleDocs) {
        setStatusMessage(`Processing ${sample.name}...`);
        const formData = new FormData();
        formData.append('demoDocId', sample.id);
        formData.append('documentId', sample.id);

        const res = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) continue;

        const result: ExtractionResult = await res.json();

        const sourceDoc: SourceDocument = {
          id: sample.id,
          title: result.document.title,
          docType: result.document.docType,
          date: result.document.date,
          facility: result.document.facility,
          clinician: result.document.clinician,
          fileRef: `/demo/${sample.id}`,
        };

        await addDocument(sourceDoc);
        queueForReview(result.items);
      }
      setStatusMessage('All 5 sample documents extracted! Review items below.');
    } catch (err) {
      console.error('Sample import error:', err);
      setStatusMessage('Error loading samples.');
    } finally {
      setImporting(false);
    }
  }

  function startEdit(item: ExtractedItem) {
    setEditingId(item.tempId);
    setEditFields({ ...(item.data as Record<string, unknown>) });
  }

  function handleAccept(item: ExtractedItem) {
    if (editingId === item.tempId) {
      acceptItem(item.tempId, editFields);
      setEditingId(null);
    } else {
      acceptItem(item.tempId);
    }
  }

  const pendingItems = record?.pendingReview || [];

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
              IMPORT & REVIEW
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Document Ingestion & Staging Queue
          </h1>
          <p className="text-xs text-zinc-500">
            Every AI-extracted fact must be reviewed and confirmed by the patient before it enters the record.
          </p>
        </div>

        <Link
          href="/vault"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition-colors"
        >
          View Vault ({record?.medications?.length || 0} meds, {record?.allergies?.length || 0} allergies)
        </Link>
      </div>

      {/* Upload & Consent Section */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">1. Document Ingestion</h2>

        {/* Consent Checkbox */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="leading-relaxed">
              <strong>Consent for AI Extraction:</strong> I understand that synthetic documents are analyzed using Google Gemini AI to extract structured clinical facts. <strong>Do not submit real, personal, or identifiable medical records.</strong>
            </span>
          </label>
        </div>

        {/* Upload Buttons */}
        <div className="grid gap-3 sm:grid-cols-2 pt-1">
          {/* File Upload Dropzone */}
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center hover:border-zinc-400 bg-zinc-50/50">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              disabled={importing}
            />
            <p className="text-xs font-semibold text-zinc-700">Upload Prescriptions or Reports</p>
            <p className="text-[11px] text-zinc-500 mt-1 mb-3">JPEG, PNG, WebP or PDF (≤4.5 MB)</p>
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              Select Files
            </button>
          </div>

          {/* Sample Demo Ingestion */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50/40 p-6 text-center">
            <p className="text-xs font-semibold text-indigo-950">Use Bundled Demo Documents</p>
            <p className="text-[11px] text-indigo-800/80 mt-1 mb-3">
              Load Meena&apos;s 5 synthetic documents (Discharge, 2 Prescriptions, 2 Labs)
            </p>
            <button
              type="button"
              disabled={importing}
              onClick={handleImportSampleDocuments}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Extracting...' : 'Load 5 Sample Documents'}
            </button>
          </div>
        </div>

        {statusMessage && (
          <p className="text-xs text-indigo-700 font-medium animate-pulse">{statusMessage}</p>
        )}
      </section>

      {/* Review Queue */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>2. Review Staging Queue</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                {pendingItems.length}
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Items in this queue are private and NEVER shared until confirmed.
            </p>
          </div>

          {pendingItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                // Accept all high confidence items
                pendingItems.forEach((item) => {
                  acceptItem(item.tempId);
                });
              }}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              Confirm All ({pendingItems.length})
            </button>
          )}
        </div>

        {pendingItems.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            <p className="font-semibold text-zinc-700">No items waiting in the review queue.</p>
            <p className="mt-1">
              Upload documents or click &quot;Load 5 Sample Documents&quot; above to stage extracted items.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((item) => {
              const isEditing = editingId === item.tempId;

              return (
                <div
                  key={item.tempId}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 shadow-2xs space-y-3 transition-colors hover:border-zinc-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                        {item.type}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          item.confidence === 'high'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.confidence === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.confidence} confidence
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAccept(item)}
                        className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        {isEditing ? 'Save & Accept' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(item))}
                        className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectItem(item.tempId)}
                        className="rounded border border-rose-200 bg-white px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Verbatim Excerpt */}
                  <div className="rounded border-l-2 border-indigo-400 bg-white p-2.5 text-xs text-zinc-700">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">
                      Verbatim Document Excerpt:
                    </span>
                    <blockquote className="italic font-mono text-[11px] text-zinc-800">
                      &ldquo;{item.excerpt}&rdquo;
                    </blockquote>
                  </div>

                  {/* Data Content / Inline Edit Form */}
                  <div className="rounded bg-white p-3 text-xs border border-zinc-100">
                    {isEditing ? (
                      <div className="space-y-2">
                        {item.type === 'medication' && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block">Medicine Name</label>
                              <input
                                type="text"
                                value={String(editFields.name || '')}
                                onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                                className="w-full rounded border border-zinc-300 p-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block">Dosage</label>
                              <input
                                type="text"
                                value={String(editFields.dosage || '')}
                                onChange={(e) => setEditFields({ ...editFields, dosage: e.target.value })}
                                className="w-full rounded border border-zinc-300 p-1 text-xs"
                              />
                            </div>
                          </div>
                        )}
                        {item.type === 'allergy' && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block">Substance</label>
                              <input
                                type="text"
                                value={String(editFields.substance || '')}
                                onChange={(e) => setEditFields({ ...editFields, substance: e.target.value })}
                                className="w-full rounded border border-zinc-300 p-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block">Reaction</label>
                              <input
                                type="text"
                                value={String(editFields.reaction || '')}
                                onChange={(e) => setEditFields({ ...editFields, reaction: e.target.value })}
                                className="w-full rounded border border-zinc-300 p-1 text-xs"
                              />
                            </div>
                          </div>
                        )}
                        {item.type === 'lab' && (
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block">Test</label>
                              <input
                                type="text"
                                value={String(editFields.test || '')}
                                onChange={(e) => setEditFields({ ...editFields, test: e.target.value })}
                                className="w-full rounded border border-zinc-300 p-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block">Value</label>
                              <input
                                type="number"
                                step="any"
                                value={String(editFields.value ?? '')}
                                onChange={(e) => setEditFields({ ...editFields, value: parseFloat(e.target.value) })}
                                className="w-full rounded border border-zinc-300 p-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block">Unit</label>
                              <input
                                type="text"
                                value={String(editFields.unit || '')}
                                onChange={(e) => setEditFields({ ...editFields, unit: e.target.value })}
                                className="w-full rounded border border-zinc-300 p-1 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {item.type === 'medication' && (
                          <>
                            <span className="font-semibold text-zinc-900">{item.data.name}</span>
                            {item.data.ingredients?.length > 0 && (
                              <span className="text-zinc-500">[{item.data.ingredients.join(', ')}]</span>
                            )}
                            {item.data.dosage && <span className="text-zinc-600">Dose: {item.data.dosage}</span>}
                            {item.data.prescriber && <span className="text-zinc-400">By: {item.data.prescriber}</span>}
                          </>
                        )}
                        {item.type === 'allergy' && (
                          <>
                            <span className="font-semibold text-rose-900">{item.data.substance}</span>
                            {item.data.reaction && <span className="text-zinc-600">Reaction: {item.data.reaction}</span>}
                          </>
                        )}
                        {item.type === 'lab' && (
                          <>
                            <span className="font-semibold text-zinc-900">{item.data.test}:</span>
                            <span className="font-mono text-zinc-800">{item.data.value} {item.data.unit}</span>
                            {item.data.refRange && <span className="text-zinc-400">(Ref: {item.data.refRange})</span>}
                          </>
                        )}
                        {item.type === 'condition' && (
                          <>
                            <span className="font-semibold text-zinc-900">{item.data.name}</span>
                            {item.data.since && <span className="text-zinc-500">Since: {item.data.since}</span>}
                          </>
                        )}
                        {item.type === 'event' && (
                          <>
                            <span className="font-semibold text-zinc-900">{item.data.title}</span>
                            <span className="text-zinc-500">({item.data.type})</span>
                            {item.data.facility && <span className="text-zinc-400">At: {item.data.facility}</span>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
