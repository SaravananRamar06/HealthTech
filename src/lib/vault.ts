// src/lib/vault.ts - PatientRecord store with localStorage persistence & IndexedDB file storage
// Owner: P1. Client-only zustand store. Hydrates after mount so SSR never touches localStorage.

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { set as idbSet, clear as idbClear } from 'idb-keyval';
import type {
  PatientRecord,
  Allergy,
  Condition,
  Medication,
  LabResult,
  CareEvent,
  SourceDocument,
  ShareRecord,
  ExtractedItem,
  Provenance,
} from '@/lib/types';

import demoStart from '@/lib/demo/demoStart.json';
import demoComplete from '@/lib/demo/demoComplete.json';

function itemProvenance(item: ExtractedItem, edited = false): Provenance {
  if (item.documentId) {
    return {
      kind: 'document',
      documentId: item.documentId,
      excerpt: item.excerpt,
      confidence: item.confidence,
      edited,
    };
  }
  return { kind: 'patient-reported' };
}

type UnknownData = Record<string, unknown>;

function itemToEntity(item: ExtractedItem, editedData?: UnknownData, fallbackDate?: string | null) {
  const id = `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const edited = Boolean(editedData);
  const data = (editedData ?? item.data) as UnknownData;
  const provenance = itemProvenance(item, edited);

  switch (item.type) {
    case 'medication':
      return {
        id,
        name: String(data.name || ''),
        ingredients: Array.isArray(data.ingredients) ? (data.ingredients as string[]) : [],
        strength: data.strength ? String(data.strength) : null,
        dosage: data.dosage ? String(data.dosage) : null,
        prescriber: data.prescriber ? String(data.prescriber) : null,
        prescribedOn: data.prescribedOn ? String(data.prescribedOn) : null,
        status: 'active' as const,
        provenance,
      } satisfies Medication;

    case 'allergy':
      return {
        id,
        substance: String(data.substance || ''),
        reaction: data.reaction ? String(data.reaction) : null,
        provenance,
      } satisfies Allergy;

    case 'condition':
      return {
        id,
        name: String(data.name || ''),
        since: data.since ? String(data.since) : null,
        provenance,
      } satisfies Condition;

    case 'lab':
      return {
        id,
        test: String(data.test || ''),
        value: typeof data.value === 'string' ? parseFloat(data.value) : Number(data.value || 0),
        unit: String(data.unit || ''),
        refRange: data.refRange ? String(data.refRange) : null,
        date: String(data.date || fallbackDate || new Date().toISOString().slice(0, 10)),
        provenance,
      } satisfies LabResult;

    case 'event':
      return {
        id,
        type: (data.type as CareEvent['type']) || 'visit',
        title: String(data.title || ''),
        date: data.date ? String(data.date) : null,
        facility: data.facility ? String(data.facility) : null,
        provenance,
      } satisfies CareEvent;

    default:
      return null;
  }
}

export interface VaultState {
  record: PatientRecord | null;

  // Actions per PLAN.md
  loadDemo: (mode: 'start' | 'complete') => void;
  addDocument: (doc: SourceDocument, file?: File | Blob) => Promise<void>;
  queueForReview: (items: ExtractedItem[]) => void;
  acceptItem: (tempId: string, editedData?: UnknownData) => void;
  rejectItem: (tempId: string) => void;
  updateItem: (id: string, patch: Partial<Medication | Allergy | Condition | LabResult | CareEvent>) => void;
  removeItem: (id: string) => void;
  setAllergyStatus: (status: 'unknown' | 'none-known' | 'has-allergies') => void;
  updateProfile: (profile: PatientRecord['profile']) => void;
  addPatientReportedItem: (
    type: 'medication' | 'allergy' | 'condition' | 'lab' | 'event',
    data: {
      name?: string;
      substance?: string;
      reaction?: string;
      dosage?: string;
      strength?: string;
      test?: string;
      value?: string | number;
      unit?: string;
      refRange?: string;
      date?: string;
      title?: string;
      eventType?: 'visit' | 'admission' | 'procedure';
      facility?: string;
    }
  ) => void;
  deleteAllData: () => Promise<void>;
}

export const useVault = create<VaultState>()(
  persist(
    (set, get) => ({
      record: null,

      loadDemo: (mode: 'start' | 'complete') => {
        const data = mode === 'start' ? demoStart : demoComplete;
        set({ record: JSON.parse(JSON.stringify(data)) as PatientRecord });
      },

      addDocument: async (doc: SourceDocument, file?: File | Blob) => {
        const state = get();
        if (!state.record) return;

        if (file && typeof window !== 'undefined') {
          try {
            await idbSet(doc.fileRef, file);
          } catch (e) {
            console.warn('Could not store file in IndexedDB:', e);
          }
        }

        set((latest) => latest.record ? {
          record: {
            ...latest.record,
            documents: [...latest.record.documents.filter((d) => d.id !== doc.id), doc],
          },
        } : {});
      },

      queueForReview: (items: ExtractedItem[]) => {
        const state = get();
        if (!state.record) return;

        set({
          record: {
            ...state.record,
            pendingReview: Array.from(new Map(
              [...(state.record.pendingReview || []), ...items].map((item) => [item.tempId, item])
            ).values()),
          },
        });
      },

      acceptItem: (tempId: string, editedData?: UnknownData) => {
        const state = get();
        if (!state.record) return;

        const item = state.record.pendingReview.find((i) => i.tempId === tempId);
        if (!item) return;

        const remainingPending = state.record.pendingReview.filter((i) => i.tempId !== tempId);
        const docDate = (state.record.documents || []).find((d) => d.id === item.documentId)?.date;
        const entity = itemToEntity(item, editedData, docDate);
        if (!entity) return;

        const newRecord: PatientRecord = {
          ...state.record,
          pendingReview: remainingPending,
        };

        // RULE from PLAN.md: acceptItem on an allergy sets allergyStatus to 'has-allergies'
        if (item.type === 'allergy') {
          newRecord.allergyStatus = 'has-allergies';
          newRecord.allergies = [...(newRecord.allergies || []), entity as Allergy];
        } else if (item.type === 'medication') {
          newRecord.medications = [...(newRecord.medications || []), entity as Medication];
        } else if (item.type === 'condition') {
          newRecord.conditions = [...(newRecord.conditions || []), entity as Condition];
        } else if (item.type === 'lab') {
          newRecord.labs = [...(newRecord.labs || []), entity as LabResult];
        } else if (item.type === 'event') {
          newRecord.events = [...(newRecord.events || []), entity as CareEvent];
        }

        set({ record: newRecord });
      },

      rejectItem: (tempId: string) => {
        const state = get();
        if (!state.record) return;

        set({
          record: {
            ...state.record,
            pendingReview: (state.record.pendingReview || []).filter((i) => i.tempId !== tempId),
          },
        });
      },

      updateItem: (id: string, patch: Partial<Medication | Allergy | Condition | LabResult | CareEvent>) => {
        const state = get();
        if (!state.record) return;

        const updateInList = <T extends { id: string }>(list: T[]): T[] =>
          list.map((item) => (item.id === id ? { ...item, ...patch } : item));

        set({
          record: {
            ...state.record,
            medications: updateInList(state.record.medications || []),
            allergies: updateInList(state.record.allergies || []),
            conditions: updateInList(state.record.conditions || []),
            labs: updateInList(state.record.labs || []),
            events: updateInList(state.record.events || []),
          },
        });
      },

      removeItem: (id: string) => {
        const state = get();
        if (!state.record) return;

        const removeFromList = <T extends { id: string }>(list: T[]): T[] =>
          list.filter((item) => item.id !== id);

        set({
          record: {
            ...state.record,
            medications: removeFromList(state.record.medications || []),
            allergies: removeFromList(state.record.allergies || []),
            conditions: removeFromList(state.record.conditions || []),
            labs: removeFromList(state.record.labs || []),
            events: removeFromList(state.record.events || []),
          },
        });
      },

      setAllergyStatus: (status: 'unknown' | 'none-known' | 'has-allergies') => {
        const state = get();
        if (!state.record) return;

        set({
          record: {
            ...state.record,
            allergyStatus: status,
          },
        });
      },

      updateProfile: (profile: PatientRecord['profile']) => {
        const state = get();
        if (!state.record) return;

        set({
          record: {
            ...state.record,
            profile,
          },
        });
      },

      addPatientReportedItem: (
        type: 'medication' | 'allergy' | 'condition' | 'lab' | 'event',
        data: {
          name?: string;
          substance?: string;
          reaction?: string;
          dosage?: string;
          strength?: string;
          test?: string;
          value?: string | number;
          unit?: string;
          refRange?: string;
          date?: string;
          title?: string;
          eventType?: 'visit' | 'admission' | 'procedure';
          facility?: string;
        }
      ) => {
        const state = get();
        if (!state.record) return;

        const id = `id_pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const provenance: Provenance = { kind: 'patient-reported' };

        if (type === 'medication' && data.name) {
          const med: Medication = {
            id,
            name: data.name,
            ingredients: [],
            strength: data.strength || null,
            dosage: data.dosage || null,
            prescriber: null,
            prescribedOn: null,
            status: 'active',
            provenance,
          };
          set({
            record: {
              ...state.record,
              medications: [...(state.record.medications || []), med],
            },
          });
        } else if (type === 'allergy' && data.substance) {
          const alg: Allergy = {
            id,
            substance: data.substance,
            reaction: data.reaction || null,
            provenance,
          };
          set({
            record: {
              ...state.record,
              allergyStatus: 'has-allergies',
              allergies: [...(state.record.allergies || []), alg],
            },
          });
        } else if (type === 'condition' && data.name) {
          const cond: Condition = {
            id,
            name: data.name,
            since: null,
            provenance,
          };
          set({
            record: {
              ...state.record,
              conditions: [...(state.record.conditions || []), cond],
            },
          });
        } else if (type === 'lab' && (data.test || data.name)) {
          const testName = data.test || data.name || 'Lab Test';
          const val = typeof data.value === 'string' ? parseFloat(data.value) || 0 : Number(data.value || 0);
          const lab: LabResult = {
            id,
            test: testName,
            value: val,
            unit: data.unit || '',
            refRange: data.refRange || null,
            date: data.date || new Date().toISOString().slice(0, 10),
            provenance,
          };
          set({
            record: {
              ...state.record,
              labs: [...(state.record.labs || []), lab],
            },
          });
        } else if (type === 'event' && (data.title || data.name)) {
          const eventTitle = data.title || data.name || 'Clinical Encounter';
          const evt: CareEvent = {
            id,
            type: data.eventType || 'visit',
            title: eventTitle,
            date: data.date || new Date().toISOString().slice(0, 10),
            facility: data.facility || null,
            provenance,
          };
          set({
            record: {
              ...state.record,
              events: [...(state.record.events || []), evt],
            },
          });
        }
      },

      deleteAllData: async () => {
        if (typeof window !== 'undefined') {
          const shares: ShareRecord[] = JSON.parse(localStorage.getItem('handover-shares') || '[]');
          const revocations = await Promise.allSettled(shares.filter((share) => !share.revokedAt && Date.parse(share.expiresAt) > Date.now()).map(async (share) => {
            const response = await fetch(`/api/shares/${share.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${share.manageToken}` },
              signal: AbortSignal.timeout(15_000),
            });
            if (!response.ok && response.status !== 404 && response.status !== 410) {
              throw new Error('Share revocation failed');
            }
          }));
          if (revocations.some((result) => result.status === 'rejected')) {
            throw new Error('Could not revoke all shares. Your data and management tokens have been kept; please retry.');
          }
          await idbClear();
          localStorage.removeItem('handover-shares');
          window.dispatchEvent(new Event('handover-shares-change'));
        }
        set({ record: null });
        useVault.persist.clearStorage();
      },
    }),
    {
      name: 'handover-vault',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
