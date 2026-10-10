import { describe, it, expect } from 'vitest';
import { generateDeterministicAppointmentPrep, generateAppointmentPrep } from './appointmentPrep';
import demoComplete from '@/lib/demo/demoComplete.json';
import type { PatientRecord } from '@/lib/types';

describe('Appointment Preparation Assistant', () => {
  const completeRecord = demoComplete as unknown as PatientRecord;
  it('preserves unknown allergy status and selects the most recent labs', () => {
    const sheet = generateDeterministicAppointmentPrep({ ...completeRecord, allergies: [], allergyStatus: 'unknown' }, { purpose: 'Review' });
    expect(sheet.selectedAllergies[0]).toContain('unknown');
    expect(sheet.relevantHistoricalLabs[0]).toContain('2026-09-12');
  });

  it('generates appointment preparation sheet with purpose and symptoms', () => {
    const sheet = generateDeterministicAppointmentPrep(completeRecord, {
      purpose: 'Endocrinology Consultation with Dr. S. Rao',
      symptoms: ['Occasional morning dizziness', 'Fatigue in late afternoon'],
      customQuestions: ['Can I take my thyroid medicine with my morning tea?'],
    });

    expect(sheet.appointmentPurpose).toContain('Endocrinology Consultation');
    expect(sheet.patientReportedSymptoms).toContain('Occasional morning dizziness');
    expect(sheet.questionsToAsk).toContain('Can I take my thyroid medicine with my morning tea?');
    expect(sheet.selectedMedications.length).toBeGreaterThan(0);
    expect(sheet.selectedAllergies.length).toBeGreaterThan(0);
    expect(sheet.clarificationItems.length).toBeGreaterThan(0);
  });

  it('auto-suggests targeted questions based on reconciliation findings', () => {
    const sheet = generateDeterministicAppointmentPrep(completeRecord, {
      purpose: 'Endocrinology follow-up',
    });

    const metforminQuestion = sheet.questionsToAsk.find((q) =>
      q.includes('Metfora') && q.includes('Glimfora')
    );
    expect(metforminQuestion).toBeDefined();
  });

  it('runs generateAppointmentPrep with local deterministic mode safely', async () => {
    const result = await generateAppointmentPrep(completeRecord, {
      purpose: 'Routine checkup',
      forceDeterministic: true,
    });
    expect(result.mode).toBe('local');
    expect(result.sheet.appointmentPurpose).toBe('Routine checkup');
  });
});
