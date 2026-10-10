import { describe, it, expect } from 'vitest';
import { generateDeterministicClinicalBrief, generateClinicalBrief } from './clinicalBrief';
import demoComplete from '@/lib/demo/demoComplete.json';
import type { PatientRecord } from '@/lib/types';

describe('AI Clinical Brief Generator', () => {
  const completeRecord = demoComplete as unknown as PatientRecord;

  it('generates all 8 required clinical brief sections', () => {
    const brief = generateDeterministicClinicalBrief(completeRecord, 'Dr. S. Rao');
    expect(brief.patientProfile).toContain('Meena Krishnan');
    expect(brief.patientProfile).toContain('Dr. S. Rao');
    expect(brief.activeConditions.length).toBeGreaterThan(0);
    expect(brief.currentMedications.length).toBeGreaterThan(0);
    expect(brief.allergiesAndReactions.length).toBeGreaterThan(0);
    expect(brief.recentLabResults.length).toBeGreaterThan(0);
    expect(brief.proceduresAndCareEvents.length).toBeGreaterThan(0);
    expect(brief.conflictsAndUnverifiedInfo.length).toBeGreaterThan(0);
    expect(brief.sources.length).toBeGreaterThan(0);
  });

  it('preserves exact lab values, units, and dates', () => {
    const brief = generateDeterministicClinicalBrief(completeRecord);
    const hba1c = brief.recentLabResults.find((l) => l.includes('HbA1c'));
    expect(hba1c).toBeDefined();
    expect(hba1c).toContain('7.6 %');
    expect(hba1c).toContain('2026-09-12');
  });

  it('flags duplicate metformin in conflicts section', () => {
    const brief = generateDeterministicClinicalBrief(completeRecord);
    const metforminConflict = brief.conflictsAndUnverifiedInfo.find((c) =>
      c.toLowerCase().includes('metformin')
    );
    expect(metforminConflict).toBeDefined();
    expect(metforminConflict).toContain('Duplicate therapy alert');
  });

  it('runs generateClinicalBrief with local fallback safely', async () => {
    const result = await generateClinicalBrief(completeRecord, { forceDeterministic: true });
    expect(result.mode).toBe('local');
    expect(result.brief.patientProfile).toContain('Meena Krishnan');
  });
});
