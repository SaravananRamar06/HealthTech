import { describe, it, expect } from 'vitest';
import { buildSharePayload } from './payload';
import type { PatientRecord, ShareSelection } from '../types';
import demoComplete from '../demo/demoComplete.json';

describe('buildSharePayload', () => {
  const record = demoComplete as unknown as PatientRecord;
  const now = new Date('2026-10-10T12:00:00Z');
  it('does not disclose allergy status when the allergy itself is withheld', () => {
    const payload = buildSharePayload(record, {
      sections: ['allergies', 'medications'], excludedIds: record.allergies.map((a) => a.id),
      recipientLabel: 'Synthetic clinician', expiresAt: '2026-10-11T12:00:00Z',
    }, now);
    expect(payload.allergies).toEqual([]);
    expect(payload.allergyStatus).toBe('unknown');
    expect(payload.flags.some((flag) => flag.type === 'allergy-med-match')).toBe(false);
  });

  it('calculates correct age and includes all sections when selected', () => {
    const selection: ShareSelection = {
      sections: ['allergies', 'conditions', 'medications', 'labs', 'events', 'emergencyContact'],
      excludedIds: [],
      recipientLabel: 'Dr. S. Rao',
      expiresAt: '2026-10-11T12:00:00Z',
    };

    const payload = buildSharePayload(record, selection, now);

    // DOB is 1968-04-01 -> age in 2026-10 is 58
    expect(payload.patient.age).toBe(58);
    expect(payload.patient.name).toBe('Meena Krishnan');
    expect(payload.recipientLabel).toBe('Dr. S. Rao');
    expect(payload.allergies.length).toBe(1);
    expect(payload.medications.length).toBe(6);
    expect(payload.withheldCount).toBe(0);
    expect(payload.patient.emergencyContact?.name).toBe('Priya Krishnan');
  });

  it('excludes withheld items and calculates withheldCount correctly', () => {
    // Exclude med_006 (escitalopram)
    const selection: ShareSelection = {
      sections: ['allergies', 'conditions', 'medications', 'labs', 'events', 'emergencyContact'],
      excludedIds: ['med_006'],
      recipientLabel: 'Dr. S. Rao',
      expiresAt: '2026-10-11T12:00:00Z',
    };

    const payload = buildSharePayload(record, selection, now);
    expect(payload.medications.some((m) => m.id === 'med_006')).toBe(false);
    expect(payload.withheldCount).toBe(1);
  });

  it('omits unselected sections and increases withheldCount', () => {
    // Only share allergies and emergency contact
    const selection: ShareSelection = {
      sections: ['allergies', 'emergencyContact'],
      excludedIds: [],
      recipientLabel: 'Dr. S. Rao',
      expiresAt: '2026-10-11T12:00:00Z',
    };

    const payload = buildSharePayload(record, selection, now);
    expect(payload.allergies.length).toBe(1);
    expect(payload.medications.length).toBe(0);
    expect(payload.conditions.length).toBe(0);
    expect(payload.labs.length).toBe(0);
    expect(payload.events.length).toBe(0);
    // Total items in demoComplete: 1 allergy + 3 conditions + 6 meds + 8 labs + 3 events = 21 items
    // Shared: 1 allergy -> withheldCount = 20
    expect(payload.withheldCount).toBe(20);
  });

  it('strips fileRef from included source documents', () => {
    const selection: ShareSelection = {
      sections: ['allergies'],
      excludedIds: [],
      recipientLabel: 'Dr. S. Rao',
      expiresAt: '2026-10-11T12:00:00Z',
    };

    const payload = buildSharePayload(record, selection, now);
    expect(payload.documents.length).toBeGreaterThan(0);
    payload.documents.forEach((doc) => {
      expect((doc as Record<string, unknown>).fileRef).toBeUndefined();
    });
  });

  it('never leaks pendingReview items or flags based on unshared items', () => {
    const recordWithPending: PatientRecord = {
      ...record,
      pendingReview: [
        {
          tempId: 'temp_secret',
          documentId: 'doc_secret',
          excerpt: 'Patient secretly took herbal remedy',
          confidence: 'high',
          type: 'medication',
          data: {
            name: 'Herbal X',
            ingredients: ['herbal'],
            strength: '100mg',
            dosage: 'daily',
            prescriber: null,
            prescribedOn: null,
          },
        },
      ],
    };

    const selection: ShareSelection = {
      sections: ['medications'],
      excludedIds: ['med_004'], // exclude Glimfora-M1
      recipientLabel: 'Dr. S. Rao',
      expiresAt: '2026-10-11T12:00:00Z',
    };

    const payload = buildSharePayload(recordWithPending, selection, now);
    // Ensure pendingReview is not anywhere in the payload
    expect((payload as unknown as Record<string, unknown>).pendingReview).toBeUndefined();
    // Flags must not have pending-review flag
    expect(payload.flags.some((f) => f.type === 'pending-review')).toBe(false);
  });
});
