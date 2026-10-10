import { describe, it, expect } from 'vitest';
import { reconcileRecords } from './reconciliation';
import demoComplete from '@/lib/demo/demoComplete.json';
import type { PatientRecord } from '@/lib/types';

describe('Record Reconciliation Engine', () => {
  const completeRecord = demoComplete as unknown as PatientRecord;

  it('detects duplicate active ingredient across multiple prescriptions (metformin)', () => {
    const findings = reconcileRecords(completeRecord, '2026-10-10');
    const dupMetformin = findings.find((f) => f.type === 'duplicate-ingredient');
    expect(dupMetformin).toBeDefined();
    expect(dupMetformin?.title).toContain('METFORMIN');
    expect(dupMetformin?.severity).toBe('high');
    expect(dupMetformin?.records.length).toBeGreaterThan(1);
  });

  it('detects stale / outdated medications prescribed >180 days ago', () => {
    const findings = reconcileRecords(completeRecord, '2026-10-10');
    const staleAmlodipine = findings.find((f) => f.type === 'outdated-medication' && f.title.includes('amlodipine'));
    expect(staleAmlodipine).toBeDefined();
    expect(staleAmlodipine?.severity).toBe('medium');
    expect(staleAmlodipine?.explanation).toContain('2025-01-15');
  });

  it('detects chronological lab progression with baseline and follow-up delta', () => {
    const findings = reconcileRecords(completeRecord, '2026-10-10');
    const hba1cTrend = findings.find((f) => f.type === 'lab-discordance' && f.title.includes('HbA1c'));
    expect(hba1cTrend).toBeDefined();
    expect(hba1cTrend?.records.length).toBe(2);
    expect(hba1cTrend?.explanation).toContain('8.4');
    expect(hba1cTrend?.explanation).toContain('7.6');
  });

  it('flags patient-reported items lacking source documents', () => {
    const findings = reconcileRecords(completeRecord, '2026-10-10');
    const unconfirmed = findings.find((f) => f.title.includes('Unverified Provenance') && f.title.includes('escitalopram'));
    expect(unconfirmed).toBeDefined();
    expect(unconfirmed?.suggestedResolution).toContain('Upload');
  });
});
