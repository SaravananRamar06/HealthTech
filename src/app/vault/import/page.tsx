'use client';

// Owner: P2. Document import & human-in-the-loop review queue
// Mandates patient/caregiver review before any fact enters the vault or can be shared.

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useVault } from '@/lib/vault';
import { useIsMounted } from '@/lib/useIsMounted';
import type { ExtractedItem, ExtractionResult, SourceDocument } from '@/lib/types';
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Check,
  Edit3,
  X,
  Loader2,
} from 'lucide-react';

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
      <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#14382f]" />
          <p className="text-sm font-medium text-[#525d56]">Loading import studio...</p>
        </div>
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

    if (!record) {
      loadDemo('start');
    }

    setImporting(true);
    setStatusMessage(`Processing ${files.length} document(s) concurrently...`);

    try {
      const fileList = Array.from(files);
      const promises = fileList.map(async (file, i) => {
        const formData = new FormData();
        formData.append('file', file);
        const docId = `doc_${Date.now()}_${i}`;
        formData.append('documentId', docId);

        const res = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Failed to extract ${file.name}`);
        }

        const result: ExtractionResult = await res.json();

        const sourceDoc: SourceDocument = {
          id: docId,
          title: result.document.title || file.name,
          docType: result.document.docType || 'other',
          date: result.document.date,
          facility: result.document.facility,
          clinician: result.document.clinician,
          fileRef: `idb:${docId}`,
        };

        return { sourceDoc, items: result.items, file };
      });

      const settled = await Promise.allSettled(promises);
      const successfulDocs: { doc: SourceDocument; file: File }[] = [];
      const successfulItems: ExtractedItem[] = [];

      for (const res of settled) {
        if (res.status === 'fulfilled') {
          successfulDocs.push({ doc: res.value.sourceDoc, file: res.value.file });
          successfulItems.push(...res.value.items);
        } else {
          console.error('File extraction failure:', res.reason);
        }
      }

      for (const { doc, file } of successfulDocs) {
        await addDocument(doc, file);
      }
      if (successfulItems.length > 0) {
        queueForReview(successfulItems);
      }

      setStatusMessage(`Extraction complete (${successfulDocs.length} documents)! Please review each item below.`);
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
    setStatusMessage('Importing 5 sample demo documents in parallel...');

    const sampleDocs = [
      { id: 'doc_01', name: 'Discharge Summary (Jan 2025)' },
      { id: 'doc_02', name: 'GP Prescription - Dr. A. Iyer (Mar 2026)' },
      { id: 'doc_03', name: 'Lab Report - Blood Tests (Apr 2026)' },
      { id: 'doc_04', name: 'Specialist Prescription - Dr. R. Menon (Jul 2026)' },
      { id: 'doc_05', name: 'Follow-up Lab Report (Sep 2026)' },
    ];

    try {
      const promises = sampleDocs.map(async (sample) => {
        const formData = new FormData();
        formData.append('demoDocId', sample.id);
        formData.append('documentId', sample.id);

        const res = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Failed to extract ${sample.name}`);
        }

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

        return { sourceDoc, items: result.items };
      });

      const settled = await Promise.allSettled(promises);
      const successfulDocs: SourceDocument[] = [];
      const successfulItems: ExtractedItem[] = [];

      for (const res of settled) {
        if (res.status === 'fulfilled') {
          successfulDocs.push(res.value.sourceDoc);
          successfulItems.push(...res.value.items);
        } else {
          console.error('Sample extraction failure:', res.reason);
        }
      }

      for (const doc of successfulDocs) {
        await addDocument(doc);
      }
      if (successfulItems.length > 0) {
        queueForReview(successfulItems);
      }

      setStatusMessage(`All ${successfulDocs.length} sample documents extracted! Review items below.`);
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
              IMPORT &amp; REVIEW
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14382f]">
            Document Ingestion &amp; Staging Queue
          </h1>
          <p className="text-xs text-[#525d56] mt-0.5">
            Every AI-extracted fact must be reviewed and confirmed by the patient before it enters the vault or can be shared.
          </p>
        </div>

        <Link
          href="/vault"
          className="inline-flex items-center gap-2 rounded-xl bg-[#14382f] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1a473c] transition-colors"
        >
          <span>View Vault</span>
          <span className="rounded-md bg-[#2b8a7e] px-1.5 py-0.5 text-[10px] text-white">
            {record?.medications?.length || 0} meds
          </span>
        </Link>
      </div>

      {/* Upload & Consent Section */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-[#14382f] flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-[#2b8a7e]" />
          <span>1. Ingest Clinical Documents</span>
        </h2>

        {/* Consent Checkbox */}
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 text-xs text-amber-950 shadow-2xs">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[#14382f] focus:ring-[#2b8a7e]"
            />
            <span className="leading-relaxed">
              <strong>Consent for AI Extraction:</strong> I understand that synthetic documents are analyzed using Google Gemini AI to extract structured clinical facts. <strong>Do not submit real, personal, or identifiable medical records.</strong>
            </span>
          </label>
        </div>

        {/* Upload Buttons */}
        <div className="grid gap-4 sm:grid-cols-2 pt-1">
          {/* File Upload Dropzone */}
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d6ded5] bg-[#f8f9f5] p-6 text-center hover:border-[#2b8a7e] hover:bg-white transition-all">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              disabled={importing}
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ddf2e8] text-[#14382f] mb-2 shadow-2xs">
              <UploadCloud className="h-5 w-5 text-[#2b8a7e]" />
            </div>
            <p className="text-xs font-bold text-[#14382f]">Upload Prescriptions or Reports</p>
            <p className="text-[11px] text-[#6e7771] mt-0.5 mb-3">JPEG, PNG, WebP or PDF (≤4.5 MB)</p>
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-[#14382f] px-4 py-2 text-xs font-bold text-white hover:bg-[#1a473c] disabled:opacity-50 transition-colors shadow-2xs"
            >
              Select Files
            </button>
          </div>

          {/* Sample Demo Ingestion */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#b8decb] bg-[#f0f9f5] p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ddf2e8] text-[#14382f] mb-2 shadow-2xs">
              <Sparkles className="h-5 w-5 text-[#2b8a7e]" />
            </div>
            <p className="text-xs font-bold text-[#14382f]">Use Bundled Demo Documents</p>
            <p className="text-[11px] text-[#525d56] mt-0.5 mb-3">
              Load Meena&apos;s 5 synthetic documents (Discharge, 2 Prescriptions, 2 Labs)
            </p>
            <button
              type="button"
              disabled={importing}
              onClick={handleImportSampleDocuments}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2b8a7e] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#236f65] disabled:opacity-50 transition-colors"
            >
              {importing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <span>Load 5 Sample Documents</span>
              )}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-[#ddf2e8]/70 border border-[#b8decb] p-3 text-xs text-[#14382f] font-semibold animate-fade-in">
            <Sparkles className="h-4 w-4 text-[#2b8a7e] shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </section>

      {/* Review Queue */}
      <section className="glass-panel rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2ec] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#14382f] flex items-center gap-2">
              <span>2. Review Staging Queue</span>
              <span className="rounded-full bg-[#14382f] px-2.5 py-0.5 text-xs font-bold text-[#ddf2e8]">
                {pendingItems.length}
              </span>
            </h2>
            <p className="text-xs text-[#6e7771] mt-0.5">
              Items in this queue are private and NEVER shared until confirmed.
            </p>
          </div>

          {pendingItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                pendingItems.forEach((item) => {
                  acceptItem(item.tempId);
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#b8decb] bg-[#ddf2e8] px-3.5 py-2 text-xs font-bold text-[#14382f] hover:bg-[#ccebe0] transition-colors shadow-2xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#2b8a7e]" />
              <span>Confirm All ({pendingItems.length})</span>
            </button>
          )}
        </div>

        {pendingItems.length === 0 ? (
          <div className="py-10 text-center text-[#6e7771] text-xs space-y-1">
            <p className="font-bold text-sm text-[#14382f]">No items waiting in the review queue.</p>
            <p>
              Upload documents or click &quot;Load 5 Sample Documents&quot; above to stage extracted items.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {pendingItems.map((item) => {
              const isEditing = editingId === item.tempId;

              return (
                <div
                  key={item.tempId}
                  className="rounded-xl border border-[#e2e7e0] bg-[#f8f9f5] p-4 shadow-2xs space-y-3 transition-all hover:border-[#b8c9bf] hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#e5eae3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#14382f]">
                        {item.type}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.confidence === 'high'
                            ? 'bg-[#ddf2e8] text-[#14382f] border border-[#b8decb]'
                            : item.confidence === 'medium'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {item.confidence} confidence
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAccept(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#14382f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1a473c] transition-colors shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5 text-[#3eb4a4]" />
                        <span>{isEditing ? 'Save & Accept' : 'Accept'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(item))}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#d6ded5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#525d56] hover:bg-[#f1f4ee] transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectItem(item.tempId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Verbatim Excerpt */}
                  <div className="rounded-xl border-l-4 border-l-[#2b8a7e] border border-[#e2e7e0] bg-white p-3 text-xs text-[#1c2420]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e7771] block mb-0.5">
                      Verbatim Document Excerpt:
                    </span>
                    <blockquote className="italic font-mono text-[11px] text-[#2c3832]">
                      &ldquo;{item.excerpt}&rdquo;
                    </blockquote>
                  </div>

                  {/* Data Content / Inline Edit Form */}
                  <div className="rounded-xl bg-white p-3.5 text-xs border border-[#e2e7e0]">
                    {isEditing ? (
                      <div className="space-y-2.5">
                        {item.type === 'medication' && (
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] text-[#14382f] font-bold block mb-1">Medicine Name</label>
                              <input
                                type="text"
                                value={String(editFields.name || '')}
                                onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                                className="w-full rounded-lg border border-[#d6ded5] p-1.5 text-xs focus:border-[#2b8a7e] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#14382f] font-bold block mb-1">Dosage</label>
                              <input
                                type="text"
                                value={String(editFields.dosage || '')}
                                onChange={(e) => setEditFields({ ...editFields, dosage: e.target.value })}
                                className="w-full rounded-lg border border-[#d6ded5] p-1.5 text-xs focus:border-[#2b8a7e] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                        {item.type === 'allergy' && (
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] text-[#14382f] font-bold block mb-1">Substance</label>
                              <input
                                type="text"
                                value={String(editFields.substance || '')}
                                onChange={(e) => setEditFields({ ...editFields, substance: e.target.value })}
                                className="w-full rounded-lg border border-[#d6ded5] p-1.5 text-xs focus:border-[#2b8a7e] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#14382f] font-bold block mb-1">Reaction</label>
                              <input
                                type="text"
                                value={String(editFields.reaction || '')}
                                onChange={(e) => setEditFields({ ...editFields, reaction: e.target.value })}
                                className="w-full rounded-lg border border-[#d6ded5] p-1.5 text-xs focus:border-[#2b8a7e] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                        {item.type === 'lab' && (
                          <div className="grid gap-2.5 sm:grid-cols-3">
                            <div>
                              <label className="text-[10px] text-[#14382f] font-bold block mb-1">Test</label>
                              <input
                                type="text"
                                value={String(editFields.test || '')}
                                onChange={(e) => setEditFields({ ...editFields, test: e.target.value })}
                                className="w-full rounded-lg border border-[#d6ded5] p-1.5 text-xs focus:border-[#2b8a7e] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#14382f] font-bold block mb-1">Value</label>
                              <input
                                type="number"
                                step="any"
                                value={String(editFields.value ?? '')}
                                onChange={(e) => setEditFields({ ...editFields, value: parseFloat(e.target.value) })}
                                className="w-full rounded-lg border border-[#d6ded5] p-1.5 text-xs focus:border-[#2b8a7e] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#14382f] font-bold block mb-1">Unit</label>
                              <input
                                type="text"
                                value={String(editFields.unit || '')}
                                onChange={(e) => setEditFields({ ...editFields, unit: e.target.value })}
                                className="w-full rounded-lg border border-[#d6ded5] p-1.5 text-xs focus:border-[#2b8a7e] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {item.type === 'medication' && (
                          <>
                            <span className="font-bold text-[#14382f]">{item.data.name}</span>
                            {item.data.ingredients?.length > 0 && (
                              <span className="text-[#6e7771]">[{item.data.ingredients.join(', ')}]</span>
                            )}
                            {item.data.dosage && <span className="text-[#404a44]">Dose: <strong>{item.data.dosage}</strong></span>}
                            {item.data.prescriber && <span className="text-[#6e7771]">By: {item.data.prescriber}</span>}
                          </>
                        )}
                        {item.type === 'allergy' && (
                          <>
                            <span className="font-bold text-rose-950">{item.data.substance}</span>
                            {item.data.reaction && <span className="text-rose-800">Reaction: {item.data.reaction}</span>}
                          </>
                        )}
                        {item.type === 'lab' && (
                          <>
                            <span className="font-bold text-[#14382f]">{item.data.test}:</span>
                            <span className="font-mono font-bold text-[#14382f]">{item.data.value} {item.data.unit}</span>
                            {item.data.refRange && <span className="text-[#6e7771]">(Ref: {item.data.refRange})</span>}
                          </>
                        )}
                        {item.type === 'condition' && (
                          <>
                            <span className="font-bold text-[#14382f]">{item.data.name}</span>
                            {item.data.since && <span className="text-[#6e7771]">Since: {item.data.since}</span>}
                          </>
                        )}
                        {item.type === 'event' && (
                          <>
                            <span className="font-bold text-[#14382f]">{item.data.title}</span>
                            <span className="text-[#6e7771]">({item.data.type})</span>
                            {item.data.facility && <span className="text-[#859088]">At: {item.data.facility}</span>}
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
