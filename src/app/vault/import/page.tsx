'use client';

// Owner: P2. Document import & human-in-the-loop review queue
// Mandates patient/caregiver review before any fact enters the vault or can be shared.

import { useState, useRef } from 'react';
import Link from 'next/link';
import { WorkflowStrip } from '@/components/ui/WorkflowStrip';
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

async function processDocuments<T, U>(documents: T[], process: (document: T, index: number) => Promise<U>) {
  const results: PromiseSettledResult<U>[] = [];
  for (let index = 0; index < documents.length; index += 2) {
    results.push(...await Promise.allSettled(
      documents.slice(index, index + 2).map((document, offset) => process(document, index + offset))
    ));
  }
  return results;
}

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
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--brand-ink)]" />
          <p className="text-sm font-medium text-[color:var(--muted-grey)]">Loading import studio...</p>
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
    setStatusMessage(`Processing ${files.length} document(s), at most two at a time...`);

    try {
      const fileList = Array.from(files);
      const settled = await processDocuments(fileList, async (file, i) => {
        const formData = new FormData();
        formData.append('file', file);
        const docId = `doc_${Date.now()}_${i}`;
        formData.append('documentId', docId);

        const res = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(45_000),
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

        return { sourceDoc, items: result.items, file, mode: result.mode };
      });

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

      const cachedCount = settled.filter((result) => result.status === 'fulfilled' && result.value.mode === 'cached-demo').length;
      const failedCount = fileList.length - successfulDocs.length;
      setStatusMessage(`${successfulDocs.length} document(s) processed (${cachedCount} cached demo). ${failedCount ? `${failedCount} failed; use bundled samples or manual entry. ` : ''}Review extracted items below.`);
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
    setStatusMessage('Loading cached extraction for the synthetic sample documents...');

    const sampleDocs = [
      { id: 'doc_01', name: 'Discharge Summary (Jan 2025)', file: 'doc_01_discharge.pdf' },
      { id: 'doc_02', name: 'GP Prescription - Dr. A. Iyer (Mar 2026)', file: 'doc_02_gp_rx.jpg' },
      { id: 'doc_03', name: 'Lab Report - Blood Tests (Apr 2026)', file: 'doc_03_labs.pdf' },
      { id: 'doc_04', name: 'Specialist Prescription - Dr. R. Menon (Jul 2026)', file: 'doc_04_dia_rx.jpg' },
      { id: 'doc_05', name: 'Follow-up Lab Report (Sep 2026)', file: 'doc_05_labs.jpg' },
    ].filter((sample) => !useVault.getState().record?.documents.some((doc) => doc.id === sample.id));

    try {
      const settled = await processDocuments(sampleDocs, async (sample) => {
        const formData = new FormData();
        formData.append('demoDocId', sample.id);
        formData.append('documentId', sample.id);

        const res = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(45_000),
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
          fileRef: `/demo/${sample.file}`,
        };

        return { sourceDoc, items: result.items };
      });

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

      setStatusMessage(sampleDocs.length === 0 ? 'Sample documents are already imported. Review the existing queue below.' : `${successfulDocs.length} sample documents loaded using cached demo extraction. ${sampleDocs.length - successfulDocs.length} failed. Review items below.`);
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
    <main className="app-shell space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/vault"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-[color:var(--muted-grey)] hover:text-[color:var(--brand-ink)] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Vault</span>
            </Link>
            <span className="text-[#d3e8dc]">/</span>
            <span className="rounded-md bg-[var(--mint-100)] px-2 py-0.5 text-[13px] font-bold text-[color:var(--brand-ink)]">
              IMPORT &amp; REVIEW
            </span>
          </div>
          <h1 className="page-title mt-3 text-[color:var(--brand-ink)]">
            Import, review, and make it yours.
          </h1>
          <p className="text-[13px] text-[color:var(--muted-grey)] mt-0.5">
            Every AI-extracted fact must be reviewed and confirmed by the patient before it enters the vault or can be shared.
          </p>
        </div>

        <Link
          href="/vault"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--forest-800)] px-4 py-2.5 text-[13px] font-bold text-white shadow-xs hover:bg-[var(--forest-700)] transition-colors"
        >
          <span>View Vault</span>
          <span className="rounded-md bg-[var(--teal-action)] px-1.5 py-0.5 text-[12px] text-white">
            {record?.medications?.length || 0} meds
          </span>
        </Link>
      </div>

      <WorkflowStrip current="import" />
      {/* Upload & Consent Section */}
      <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-[color:var(--brand-ink)] flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-[color:var(--teal-text)]" />
          <span>1. Ingest Clinical Documents</span>
        </h2>

        {/* Consent Checkbox */}
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 text-[13px] text-amber-950 shadow-2xs">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[color:var(--brand-ink)] focus:ring-[var(--teal-text)]"
            />
            <span className="leading-relaxed">
              <strong>Consent for AI Extraction:</strong> I understand that synthetic documents are analyzed using Google Gemini AI to extract structured clinical facts. <strong>Do not submit real, personal, or identifiable medical records.</strong>
            </span>
          </label>
        </div>

        {/* Upload Buttons */}
        <div className="grid gap-4 sm:grid-cols-2 pt-1">
          {/* File Upload Dropzone */}
          <div className="upload-zone flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-card)] bg-[var(--background)] p-6 text-center hover:border-[var(--teal-text)] hover:bg-white transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              disabled={importing}
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mint-100)] text-[color:var(--brand-ink)] mb-2 shadow-2xs">
              <UploadCloud className="h-5 w-5 text-[color:var(--teal-text)]" />
            </div>
            <p className="text-[13px] font-bold text-[color:var(--brand-ink)]">Upload Prescriptions or Reports</p>
            <p className="text-[12px] text-[color:var(--muted-grey)] mt-0.5 mb-3">JPEG, PNG, WebP or PDF (≤4 MB)</p>
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-[var(--forest-800)] px-4 py-2 text-[13px] font-bold text-white hover:bg-[var(--forest-700)] disabled:opacity-50 transition-colors shadow-2xs"
            >
              Select Files
            </button>
          </div>

          {/* Sample Demo Ingestion */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-muted)] p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mint-100)] text-[color:var(--brand-ink)] mb-2 shadow-2xs">
              <Sparkles className="h-5 w-5 text-[color:var(--teal-text)]" />
            </div>
            <p className="text-[13px] font-bold text-[color:var(--brand-ink)]">Use Bundled Demo Documents</p>
            <p className="text-[12px] text-[color:var(--muted-grey)] mt-0.5 mb-3">
              Load Meena&apos;s 5 synthetic documents (Discharge, 2 Prescriptions, 2 Labs)
            </p>
            <button
              type="button"
              disabled={importing}
              onClick={handleImportSampleDocuments}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--teal-action)] px-4 py-2 text-[13px] font-bold text-white shadow-2xs hover:bg-[var(--teal-action)] disabled:opacity-50 transition-colors"
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
          <div className="flex items-center gap-2 rounded-xl bg-[var(--mint-100)]/70 border border-[var(--border-strong)] p-3 text-[13px] text-[color:var(--brand-ink)] font-semibold animate-fade-in">
            <Sparkles className="h-4 w-4 text-[color:var(--teal-text)] shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </section>

      {/* Review Queue */}
      <section className="glass-panel record-section rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2ec] pb-4">
          <div>
            <h2 className="text-base font-bold text-[color:var(--brand-ink)] flex items-center gap-2">
              <span>2. Review Staging Queue</span>
              <span className="rounded-full bg-[var(--forest-800)] px-2.5 py-0.5 text-[13px] font-bold text-[#e4eee5]">
                {pendingItems.length}
              </span>
            </h2>
            <p className="text-[13px] text-[color:var(--muted-grey)] mt-0.5">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--mint-100)] px-3.5 py-2 text-[13px] font-bold text-[color:var(--brand-ink)] hover:bg-[var(--mint-100)] transition-colors shadow-2xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--teal-text)]" />
              <span>Confirm All ({pendingItems.length})</span>
            </button>
          )}
        </div>

        {pendingItems.length === 0 ? (
          <div className="py-10 text-center text-[color:var(--muted-grey)] text-[13px] space-y-1">
            <p className="font-bold text-sm text-[color:var(--brand-ink)]">No items waiting in the review queue.</p>
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
                  className="review-item rounded-xl border border-[var(--border-card)] bg-[var(--background)] p-4 shadow-2xs space-y-3 transition-colors hover:border-[var(--border-strong)] hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider text-[color:var(--brand-ink)]">
                        {item.type}
                      </span>
                      <span className="text-[12px] text-[color:var(--muted-grey)]">AI-extracted · awaiting review</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.confidence === 'high'
                            ? 'bg-[var(--mint-100)] text-[color:var(--brand-ink)] border border-[var(--border-strong)]'
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
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--forest-800)] px-3 py-1.5 text-[13px] font-bold text-white hover:bg-[var(--forest-700)] transition-colors shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5 text-[#8ccab5]" />
                        <span>{isEditing ? 'Save & Accept' : 'Accept'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(item))}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-card)] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[color:var(--muted-grey)] hover:bg-[var(--surface-muted)] transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectItem(item.tempId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Verbatim Excerpt */}
                  <div className="rounded-xl border-l-4 border-l-[var(--teal-text)] border border-[var(--border-card)] bg-white p-3 text-[13px] text-[color:var(--brand-ink)]">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--muted-grey)] block mb-0.5">
                      Verbatim Document Excerpt:
                    </span>
                    <blockquote className="italic font-mono text-[12px] text-[color:var(--brand-ink)]">
                      &ldquo;{item.excerpt}&rdquo;
                    </blockquote>
                  </div>

                  {/* Data Content / Inline Edit Form */}
                  <div className="rounded-xl bg-white p-3.5 text-[13px] border border-[var(--border-card)]">
                    {isEditing ? (
                      <div className="space-y-2.5">
                        {item.type === 'medication' && (
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <label htmlFor="import-page-field-1" className="text-[12px] text-[color:var(--brand-ink)] font-bold block mb-1">Medicine Name</label>
                              <input id="import-page-field-1"
                                type="text"
                                value={String(editFields.name || '')}
                                onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                                className="w-full rounded-lg border border-[var(--border-card)] p-1.5 text-[13px] focus:border-[var(--teal-text)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label htmlFor="import-page-field-2" className="text-[12px] text-[color:var(--brand-ink)] font-bold block mb-1">Dosage</label>
                              <input id="import-page-field-2"
                                type="text"
                                value={String(editFields.dosage || '')}
                                onChange={(e) => setEditFields({ ...editFields, dosage: e.target.value })}
                                className="w-full rounded-lg border border-[var(--border-card)] p-1.5 text-[13px] focus:border-[var(--teal-text)] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                        {item.type === 'allergy' && (
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <label htmlFor="import-page-field-3" className="text-[12px] text-[color:var(--brand-ink)] font-bold block mb-1">Substance</label>
                              <input id="import-page-field-3"
                                type="text"
                                value={String(editFields.substance || '')}
                                onChange={(e) => setEditFields({ ...editFields, substance: e.target.value })}
                                className="w-full rounded-lg border border-[var(--border-card)] p-1.5 text-[13px] focus:border-[var(--teal-text)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label htmlFor="import-page-field-4" className="text-[12px] text-[color:var(--brand-ink)] font-bold block mb-1">Reaction</label>
                              <input id="import-page-field-4"
                                type="text"
                                value={String(editFields.reaction || '')}
                                onChange={(e) => setEditFields({ ...editFields, reaction: e.target.value })}
                                className="w-full rounded-lg border border-[var(--border-card)] p-1.5 text-[13px] focus:border-[var(--teal-text)] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                        {item.type === 'lab' && (
                          <div className="grid gap-2.5 sm:grid-cols-3">
                            <div>
                              <label htmlFor="import-page-field-5" className="text-[12px] text-[color:var(--brand-ink)] font-bold block mb-1">Test</label>
                              <input id="import-page-field-5"
                                type="text"
                                value={String(editFields.test || '')}
                                onChange={(e) => setEditFields({ ...editFields, test: e.target.value })}
                                className="w-full rounded-lg border border-[var(--border-card)] p-1.5 text-[13px] focus:border-[var(--teal-text)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label htmlFor="import-page-field-6" className="text-[12px] text-[color:var(--brand-ink)] font-bold block mb-1">Value</label>
                              <input id="import-page-field-6"
                                type="number"
                                step="any"
                                value={String(editFields.value ?? '')}
                                onChange={(e) => setEditFields({ ...editFields, value: parseFloat(e.target.value) })}
                                className="w-full rounded-lg border border-[var(--border-card)] p-1.5 text-[13px] focus:border-[var(--teal-text)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label htmlFor="import-page-field-7" className="text-[12px] text-[color:var(--brand-ink)] font-bold block mb-1">Unit</label>
                              <input id="import-page-field-7"
                                type="text"
                                value={String(editFields.unit || '')}
                                onChange={(e) => setEditFields({ ...editFields, unit: e.target.value })}
                                className="w-full rounded-lg border border-[var(--border-card)] p-1.5 text-[13px] focus:border-[var(--teal-text)] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {item.type === 'medication' && (
                          <>
                            <span className="font-bold text-[color:var(--brand-ink)]">{item.data.name}</span>
                            {item.data.ingredients?.length > 0 && (
                              <span className="text-[color:var(--muted-grey)]">[{item.data.ingredients.join(', ')}]</span>
                            )}
                            {item.data.dosage && <span className="text-[color:var(--brand-ink)]">Dose: <strong>{item.data.dosage}</strong></span>}
                            {item.data.prescriber && <span className="text-[color:var(--muted-grey)]">By: {item.data.prescriber}</span>}
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
                            <span className="font-bold text-[color:var(--brand-ink)]">{item.data.test}:</span>
                            <span className="font-mono font-bold text-[color:var(--brand-ink)]">{item.data.value} {item.data.unit}</span>
                            {item.data.refRange && <span className="text-[color:var(--muted-grey)]">(Ref: {item.data.refRange})</span>}
                          </>
                        )}
                        {item.type === 'condition' && (
                          <>
                            <span className="font-bold text-[color:var(--brand-ink)]">{item.data.name}</span>
                            {item.data.since && <span className="text-[color:var(--muted-grey)]">Since: {item.data.since}</span>}
                          </>
                        )}
                        {item.type === 'event' && (
                          <>
                            <span className="font-bold text-[color:var(--brand-ink)]">{item.data.title}</span>
                            <span className="text-[color:var(--muted-grey)]">({item.data.type})</span>
                            {item.data.facility && <span className="text-[color:var(--muted-grey)]">At: {item.data.facility}</span>}
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
