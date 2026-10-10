import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVault } from './vault';
import { set as idbSet, clear as idbClear } from 'idb-keyval';

vi.mock('idb-keyval', () => ({ set: vi.fn(async () => {}), clear: vi.fn(async () => {}) }));

describe('useVault store & interactive operations', () => {
  beforeEach(async () => {
    await useVault.getState().deleteAllData();
  });

  it('initializes with null record and loads demo data', () => {
    expect(useVault.getState().record).toBeNull();
    useVault.getState().loadDemo('start');
    const record = useVault.getState().record;
    expect(record).not.toBeNull();
    expect(record?.profile.name).toBe('Meena Krishnan');
    expect(record?.medications.length).toBeGreaterThan(0);
  });

  it('allows viewing and updating synthetic patient profile', () => {
    useVault.getState().loadDemo('start');
    const updatedProfile = {
      name: 'Priya Krishnan',
      dateOfBirth: '1992-06-15',
      sex: 'female' as const,
      emergencyContact: {
        name: 'Arun Krishnan',
        phone: '+91 98401 99999',
      },
    };

    useVault.getState().updateProfile(updatedProfile);
    const current = useVault.getState().record;
    expect(current?.profile.name).toBe('Priya Krishnan');
    expect(current?.profile.dateOfBirth).toBe('1992-06-15');
    expect(current?.profile.emergencyContact?.name).toBe('Arun Krishnan');
  });

  it('supports adding patient-reported records across all categories', () => {
    useVault.getState().loadDemo('start');

    // 1. Add medication
    useVault.getState().addPatientReportedItem('medication', {
      name: 'Atorvastatin',
      strength: '20 mg',
      dosage: '1 tablet daily at bedtime',
    });
    let current = useVault.getState().record!;
    const med = current.medications.find((m) => m.name === 'Atorvastatin');
    expect(med).toBeDefined();
    expect(med?.provenance.kind).toBe('patient-reported');

    // 2. Add allergy
    useVault.getState().addPatientReportedItem('allergy', {
      substance: 'Ciprofloxacin',
      reaction: 'Severe nausea and hives',
    });
    current = useVault.getState().record!;
    const alg = current.allergies.find((a) => a.substance === 'Ciprofloxacin');
    expect(alg).toBeDefined();
    expect(current.allergyStatus).toBe('has-allergies');

    // 3. Add condition
    useVault.getState().addPatientReportedItem('condition', {
      name: 'Essential Hypertension',
    });
    current = useVault.getState().record!;
    expect(current.conditions.some((c) => c.name === 'Essential Hypertension')).toBe(true);

    // 4. Add lab test
    useVault.getState().addPatientReportedItem('lab', {
      test: 'Serum Creatinine',
      value: 1.1,
      unit: 'mg/dL',
      refRange: '0.6 - 1.2 mg/dL',
    });
    current = useVault.getState().record!;
    const lab = current.labs.find((l) => l.test === 'Serum Creatinine');
    expect(lab).toBeDefined();
    expect(lab?.value).toBe(1.1);

    // 5. Add clinical encounter
    useVault.getState().addPatientReportedItem('event', {
      title: 'Cardiology Review',
      eventType: 'visit',
      facility: 'Fortis Hospital',
    });
    current = useVault.getState().record!;
    const evt = current.events.find((e) => e.title === 'Cardiology Review');
    expect(evt).toBeDefined();
    expect(evt?.facility).toBe('Fortis Hospital');
  });

  it('supports removing items and updating medication status', () => {
    useVault.getState().loadDemo('start');
    const initialMedCount = useVault.getState().record!.medications.length;
    const targetMed = useVault.getState().record!.medications[0];

    // Mark medication as stopped
    useVault.getState().updateItem(targetMed.id, { status: 'stopped' });
    expect(
      useVault.getState().record!.medications.find((m) => m.id === targetMed.id)?.status
    ).toBe('stopped');

    // Delete medication
    useVault.getState().removeItem(targetMed.id);
    expect(useVault.getState().record!.medications.length).toBe(initialMedCount - 1);
    expect(
      useVault.getState().record!.medications.some((m) => m.id === targetMed.id)
    ).toBe(false);
  });
  it('does not lose a pending fact when the same extraction is queued twice', () => {
    useVault.getState().loadDemo('start');
    const item = { tempId: 'synthetic_fact', documentId: 'synthetic_doc', excerpt: 'Synthetic allergy', confidence: 'high' as const, type: 'allergy' as const, data: { substance: 'Synthetic allergen', reaction: null } };
    useVault.getState().queueForReview([item]);
    useVault.getState().queueForReview([item]);
    expect(useVault.getState().record?.pendingReview).toHaveLength(1);
    useVault.getState().acceptItem(item.tempId);
    expect(useVault.getState().record?.allergies).toHaveLength(1);
  });

  it('keeps record changes made while a document file is being saved', async () => {
    useVault.getState().loadDemo('start');
    let finishSave!: () => void;
    vi.mocked(idbSet).mockImplementationOnce(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    vi.stubGlobal('window', {});
    try {
      const saving = useVault.getState().addDocument({ id: 'doc_async', title: 'Synthetic document', docType: 'other', date: null, facility: null, clinician: null, fileRef: 'idb:doc_async' }, new Blob(['synthetic']));
      useVault.getState().addPatientReportedItem('condition', { name: 'Synthetic condition' });
      finishSave();
      await saving;
      expect(useVault.getState().record?.conditions.some((condition) => condition.name === 'Synthetic condition')).toBe(true);
      expect(useVault.getState().record?.documents.some((doc) => doc.id === 'doc_async')).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('retains management tokens and the vault when share revocation fails', async () => {
    useVault.getState().loadDemo('start');
    const storage = { getItem: vi.fn(() => JSON.stringify([{ id: 'synthetic_share', manageToken: 'test-token', revokedAt: null, expiresAt: new Date(Date.now() + 60_000).toISOString() }])), removeItem: vi.fn() };
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
    try {
      await expect(useVault.getState().deleteAllData()).rejects.toThrow('Could not revoke all shares');
      expect(storage.removeItem).not.toHaveBeenCalled();
      expect(useVault.getState().record).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('revokes active shares before clearing local data', async () => {
    useVault.getState().loadDemo('start');
    const storage = { getItem: vi.fn(() => JSON.stringify([{ id: 'synthetic_share', manageToken: 'test-token', revokedAt: null, expiresAt: new Date(Date.now() + 60_000).toISOString() }, { id: 'expired_share', manageToken: 'expired-token', revokedAt: null, expiresAt: '2000-01-01T00:00:00Z' }])), removeItem: vi.fn() };
    const revoke = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', revoke);
    try {
      await useVault.getState().deleteAllData();
      expect(revoke).toHaveBeenCalledWith('/api/shares/synthetic_share', expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer test-token' } }));
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(idbClear).toHaveBeenCalled();
      expect(storage.removeItem).toHaveBeenCalledWith('handover-shares');
      expect(useVault.getState().record).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
