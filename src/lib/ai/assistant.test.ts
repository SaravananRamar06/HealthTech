import { describe, it, expect } from 'vitest';
import { generateDeterministicAnswer, askCareBridge } from './assistant';
import demoComplete from '@/lib/demo/demoComplete.json';
import demoStart from '@/lib/demo/demoStart.json';
import type { PatientRecord } from '@/lib/types';

describe('Ask CareBridge: Grounded Medical Record Assistant', () => {
  const completeRecord = demoComplete as unknown as PatientRecord;
  const startRecord = demoStart as unknown as PatientRecord;

  it('answers medication questions with exact grounded citations', () => {
    const res = generateDeterministicAnswer('Which medications are currently listed in my records?', completeRecord);
    expect(res.answer).toContain('active medication');
    expect(res.answer).toContain('amlodipine 5 mg');
    expect(res.answer).toContain('Metfora 500');
    expect(res.citations.length).toBeGreaterThan(0);
    expect(res.citations.some((c) => c.itemType === 'medication')).toBe(true);
    expect(res.uncertainty).toBe(false);
  });

  it('answers most recent HbA1c with exact numerical value, unit, and date', () => {
    const res = generateDeterministicAnswer('When was my most recent HbA1c result recorded?', completeRecord);
    expect(res.answer).toContain('7.6');
    expect(res.answer).toContain('2026-09-12');
    expect(res.citations.some((c) => c.title.includes('HbA1c'))).toBe(true);
    expect(res.uncertainty).toBe(false);
  });

  it('answers allergy queries distinguishing documented allergens and reactions', () => {
    const res = generateDeterministicAnswer('Which allergies have been documented?', completeRecord);
    expect(res.answer).toContain('amoxicillin-clavulanate');
    expect(res.answer).toContain('urticaria');
    expect(res.citations.some((c) => c.itemType === 'allergy')).toBe(true);
    expect(res.uncertainty).toBe(false);
  });

  it('identifies unconfirmed medications requiring clinical review', () => {
    const res = generateDeterministicAnswer('Which medications have a dosage that still needs confirmation?', completeRecord);
    expect(res.answer).toContain('escitalopram');
    expect(res.uncertainty).toBe(true);
  });

  it('compares two lab reports chronologically with exact deltas', () => {
    const res = generateDeterministicAnswer('What changed between these two lab reports?', completeRecord);
    expect(res.answer).toContain('HbA1c');
    expect(res.answer).toContain('8.4%');
    expect(res.answer).toContain('7.6%');
    expect(res.answer).toContain('TSH');
    expect(res.citations.length).toBeGreaterThan(1);
  });

  it('returns uncertainty response when evidence is absent from the vault', () => {
    const res = generateDeterministicAnswer('What is my knee MRI result?', completeRecord);
    expect(res.answer).toContain("I couldn't find this in your available records");
    expect(res.uncertainty).toBe(true);
  });

  it('handles empty/starting record safely with appropriate uncertainty', () => {
    const res = generateDeterministicAnswer('When was my most recent HbA1c result recorded?', startRecord);
    expect(res.answer).toContain("I couldn't find this in your available records");
    expect(res.uncertainty).toBe(true);
  });

  it('executes askCareBridge in local deterministic mode without calling external API', async () => {
    const res = await askCareBridge('Which allergies have been documented?', completeRecord, {
      forceDeterministic: true,
    });
    expect(res.mode).toBe('local');
    expect(res.answer).toContain('amoxicillin-clavulanate');
  });
});
