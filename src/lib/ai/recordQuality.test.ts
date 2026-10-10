import { describe, it, expect } from 'vitest';
import { auditRecordQuality } from './recordQuality';
import demoComplete from '@/lib/demo/demoComplete.json';
import demoStart from '@/lib/demo/demoStart.json';
import type { PatientRecord } from '@/lib/types';

describe('Record Completeness & Data Quality Auditor', () => {
  const completeRecord = demoComplete as unknown as PatientRecord;
  const startRecord = demoStart as unknown as PatientRecord;

  it('identifies unverified patient-reported provenance in complete record', () => {
    const issues = auditRecordQuality(completeRecord);
    const unverifiedEscitalopram = issues.find(
      (i) => i.itemId === 'med_006' && i.category === 'unclear-status'
    );
    expect(unverifiedEscitalopram).toBeDefined();
    expect(unverifiedEscitalopram?.title).toContain('escitalopram');
  });

  it('detects missing prescription dates and incomplete instructions', () => {
    const issues = auditRecordQuality(startRecord);
    const missingDate = issues.find((i) => i.category === 'missing-date');
    expect(missingDate).toBeDefined();
  });

  it('detects unreviewed items in pending queue', () => {
    const recordWithPending = {
      ...completeRecord,
      pendingReview: [
        {
          tempId: 'temp_1',
          documentId: 'doc_01',
          excerpt: 'Amoxicillin 500mg',
          confidence: 'high' as const,
          type: 'medication' as const,
          data: {
            name: 'Amoxicillin',
            ingredients: ['amoxicillin'],
            strength: '500mg',
            dosage: null,
            prescriber: null,
            prescribedOn: null,
          },
        },
      ],
    };
    const issues = auditRecordQuality(recordWithPending);
    const pendingIssue = issues.find((i) => i.category === 'unreviewed-extraction');
    expect(pendingIssue).toBeDefined();
    expect(pendingIssue?.title).toContain('1 unreviewed');
  });
});
