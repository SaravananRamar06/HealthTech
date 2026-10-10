import { describe, it, expect, beforeEach } from 'vitest';
import { useVault } from './vault';

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
});
