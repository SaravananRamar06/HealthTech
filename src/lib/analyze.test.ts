import { describe, it, expect } from 'vitest';
import { analyzeRecord } from './analyze';
import type { PatientRecord } from './types';
import demoComplete from './demo/demoComplete.json';

describe('analyzeRecord', () => {
  const baseRecord: PatientRecord = {
    version: 1,
    isDemo: true,
    profile: {
      name: 'Test Patient',
      dateOfBirth: '1970-01-01',
      sex: 'female',
      emergencyContact: null,
    },
    allergyStatus: 'none-known',
    allergies: [],
    conditions: [],
    medications: [],
    labs: [],
    events: [],
    documents: [],
    pendingReview: [],
  };

  it('detects unknown allergy status', () => {
    const record: PatientRecord = { ...baseRecord, allergyStatus: 'unknown' };
    const flags = analyzeRecord(record, '2026-10-10');
    expect(flags.some((f) => f.type === 'allergy-status-unknown')).toBe(true);
  });

  it('does not flag allergy-status-unknown when status is none-known or has-allergies', () => {
    const record1: PatientRecord = { ...baseRecord, allergyStatus: 'none-known' };
    expect(analyzeRecord(record1, '2026-10-10').some((f) => f.type === 'allergy-status-unknown')).toBe(false);

    const record2: PatientRecord = { ...baseRecord, allergyStatus: 'has-allergies' };
    expect(analyzeRecord(record2, '2026-10-10').some((f) => f.type === 'allergy-status-unknown')).toBe(false);
  });

  it('detects duplicate ingredients across different products', () => {
    const record: PatientRecord = {
      ...baseRecord,
      medications: [
        {
          id: 'med-1',
          name: 'Metfora 500',
          ingredients: ['metformin'],
          strength: '500 mg',
          dosage: '1 tab BD',
          prescriber: 'Dr. A',
          prescribedOn: '2026-09-01',
          status: 'active',
          provenance: { kind: 'patient-reported' },
        },
        {
          id: 'med-2',
          name: 'Glimfora-M1',
          ingredients: ['glimepiride', 'metformin'],
          strength: '1 mg + 500 mg',
          dosage: '1 tab BD',
          prescriber: 'Dr. B',
          prescribedOn: '2026-09-15',
          status: 'active',
          provenance: { kind: 'patient-reported' },
        },
      ],
    };
    const flags = analyzeRecord(record, '2026-10-10');
    const dupFlag = flags.find((f) => f.type === 'duplicate-ingredient');
    expect(dupFlag).toBeDefined();
    expect(dupFlag?.itemIds).toContain('med-1');
    expect(dupFlag?.itemIds).toContain('med-2');
  });

  it('does NOT flag refills of the same product as duplicate ingredients', () => {
    const record: PatientRecord = {
      ...baseRecord,
      medications: [
        {
          id: 'med-1',
          name: 'Metfora 500',
          ingredients: ['metformin'],
          strength: '500 mg',
          dosage: '1 tab BD',
          prescriber: 'Dr. A',
          prescribedOn: '2026-06-01',
          status: 'active',
          provenance: { kind: 'patient-reported' },
        },
        {
          id: 'med-2',
          name: 'Metfora 500',
          ingredients: ['metformin'],
          strength: '500 mg',
          dosage: '1 tab BD',
          prescriber: 'Dr. A',
          prescribedOn: '2026-09-01',
          status: 'active',
          provenance: { kind: 'patient-reported' },
        },
      ],
    };
    const flags = analyzeRecord(record, '2026-10-10');
    expect(flags.some((f) => f.type === 'duplicate-ingredient')).toBe(false);
  });

  it('detects allergy matching an active medication', () => {
    const record: PatientRecord = {
      ...baseRecord,
      allergyStatus: 'has-allergies',
      allergies: [
        {
          id: 'alg-1',
          substance: 'amoxicillin-clavulanate',
          reaction: 'urticaria',
          provenance: { kind: 'patient-reported' },
        },
      ],
      medications: [
        {
          id: 'med-1',
          name: 'Augmentin 625',
          ingredients: ['amoxicillin', 'clavulanate'],
          strength: '625 mg',
          dosage: '1 tab TDS',
          prescriber: 'Dr. C',
          prescribedOn: '2026-10-01',
          status: 'active',
          provenance: { kind: 'patient-reported' },
        },
      ],
    };
    const flags = analyzeRecord(record, '2026-10-10');
    const matchFlag = flags.find((f) => f.type === 'allergy-med-match');
    expect(matchFlag).toBeDefined();
    expect(matchFlag?.itemIds).toContain('alg-1');
    expect(matchFlag?.itemIds).toContain('med-1');
  });

  it('flags possibly outdated medications (> 180 days)', () => {
    const record: PatientRecord = {
      ...baseRecord,
      medications: [
        {
          id: 'med-old',
          name: 'Amlodipine 5mg',
          ingredients: ['amlodipine'],
          strength: '5 mg',
          dosage: 'OD',
          prescriber: 'Hospital',
          prescribedOn: '2025-01-15', // > 600 days from Oct 2026
          status: 'active',
          provenance: { kind: 'patient-reported' },
        },
        {
          id: 'med-recent',
          name: 'Metfora 500',
          ingredients: ['metformin'],
          strength: '500 mg',
          dosage: 'BD',
          prescriber: 'Dr. A',
          prescribedOn: '2026-09-01', // ~40 days from Oct 2026
          status: 'active',
          provenance: { kind: 'patient-reported' },
        },
      ],
    };
    const flags = analyzeRecord(record, '2026-10-10');
    const outdatedFlags = flags.filter((f) => f.type === 'possibly-outdated');
    expect(outdatedFlags.length).toBe(1);
    expect(outdatedFlags[0].itemIds).toContain('med-old');
  });

  it('flags pending review items', () => {
    const record: PatientRecord = {
      ...baseRecord,
      pendingReview: [
        {
          tempId: 'temp-1',
          documentId: 'doc-1',
          excerpt: 'test excerpt',
          confidence: 'high',
          type: 'allergy',
          data: { substance: 'Penicillin', reaction: 'Rash' },
        },
      ],
    };
    const flags = analyzeRecord(record, '2026-10-10');
    const pendingFlag = flags.find((f) => f.type === 'pending-review');
    expect(pendingFlag).toBeDefined();
    expect(pendingFlag?.itemIds).toContain('temp-1');
  });

  it('flags recent lab results (<= 90 days)', () => {
    const record: PatientRecord = {
      ...baseRecord,
      labs: [
        {
          id: 'lab-recent',
          test: 'HbA1c',
          value: 7.6,
          unit: '%',
          refRange: '4.0-5.6',
          date: '2026-09-12', // 28 days before 2026-10-10
          provenance: { kind: 'patient-reported' },
        },
        {
          id: 'lab-old',
          test: 'HbA1c',
          value: 8.4,
          unit: '%',
          refRange: '4.0-5.6',
          date: '2026-04-05', // > 180 days before 2026-10-10
          provenance: { kind: 'patient-reported' },
        },
      ],
    };
    const flags = analyzeRecord(record, '2026-10-10');
    const recentFlags = flags.filter((f) => f.type === 'recent-result');
    expect(recentFlags.length).toBe(1);
    expect(recentFlags[0].itemIds).toContain('lab-recent');
  });

  it('flags patient-reported items', () => {
    const record: PatientRecord = {
      ...baseRecord,
      medications: [
        {
          id: 'med-pr',
          name: 'Escitalopram 10 mg',
          ingredients: ['escitalopram'],
          strength: '10 mg',
          dosage: 'OD',
          prescriber: null,
          prescribedOn: null,
          status: 'active',
          provenance: { kind: 'patient-reported' },
        },
      ],
    };
    const flags = analyzeRecord(record, '2026-10-10');
    const prFlag = flags.find((f) => f.type === 'patient-reported-only');
    expect(prFlag).toBeDefined();
    expect(prFlag?.itemIds).toContain('med-pr');
  });

  it('analyzes demoComplete dataset correctly', () => {
    const flags = analyzeRecord(demoComplete as unknown as PatientRecord, '2026-10-10');
    // demoComplete has:
    // - duplicate metformin (med_002, med_003, med_004)
    // - possibly outdated amlodipine (med_001 from 2025-01-15)
    // - recent labs from Sep 2026 (lab_005, lab_006, lab_007, lab_008)
    // - patient reported escitalopram (med_006)
    expect(flags.some((f) => f.type === 'duplicate-ingredient')).toBe(true);
    expect(flags.some((f) => f.type === 'possibly-outdated')).toBe(true);
    expect(flags.some((f) => f.type === 'recent-result')).toBe(true);
    expect(flags.some((f) => f.type === 'patient-reported-only')).toBe(true);
  });
});
