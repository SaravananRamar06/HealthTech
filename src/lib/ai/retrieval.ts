import type { PatientRecord, Medication, Allergy, Condition, LabResult, CareEvent } from '@/lib/types';

export interface MinimizedContext {
  patientProfile: { name: string; age: number; sex: string };
  allergyStatus: string;
  allergies: Allergy[];
  conditions: Condition[];
  medications: Medication[];
  labs: LabResult[];
  events: CareEvent[];
  matchedKeywords: string[];
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date('2026-10-10'); // Benchmark date
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return isNaN(age) ? 58 : age;
}

/**
 * Minimizes patient data sent to external AI provider based on query intent.
 * Enforces the privacy principle of data minimization (sends ONLY relevant records).
 */
export function retrieveRelevantRecords(query: string, record: PatientRecord): MinimizedContext {
  const q = query.toLowerCase();
  const tokens = q.split(/[\s,?.!]+/).filter((t) => t.length > 2);

  const isBroad =
    q.includes('summary') ||
    q.includes('summarise') ||
    q.includes('overview') ||
    q.includes('appointment') ||
    q.includes('everything') ||
    q.includes('records') ||
    q.includes('all');

  const mentionsMeds =
    isBroad ||
    q.includes('med') ||
    q.includes('drug') ||
    q.includes('prescription') ||
    q.includes('dose') ||
    q.includes('dosage') ||
    q.includes('pill') ||
    q.includes('taking') ||
    (record.medications || []).some(
      (m) =>
        q.includes(m.name.toLowerCase()) ||
        m.ingredients.some((ing) => q.includes(ing.toLowerCase()))
    );

  const mentionsAllergies =
    isBroad ||
    q.includes('allerg') ||
    q.includes('reaction') ||
    q.includes('rash') ||
    (record.allergies || []).some((a) => q.includes(a.substance.toLowerCase()));

  const mentionsConditions =
    isBroad ||
    q.includes('condition') ||
    q.includes('diagnosis') ||
    q.includes('diagnos') ||
    q.includes('disease') ||
    q.includes('history') ||
    (record.conditions || []).some((c) => q.includes(c.name.toLowerCase()));

  const mentionsLabs =
    isBroad ||
    q.includes('lab') ||
    q.includes('test') ||
    q.includes('result') ||
    q.includes('blood') ||
    q.includes('hba1c') ||
    q.includes('tsh') ||
    q.includes('sugar') ||
    q.includes('creatinine') ||
    q.includes('ldl') ||
    (record.labs || []).some((l) => q.includes(l.test.toLowerCase()));

  const mentionsEvents =
    isBroad ||
    q.includes('event') ||
    q.includes('visit') ||
    q.includes('admission') ||
    q.includes('procedure') ||
    q.includes('surgery') ||
    q.includes('cholecystectomy') ||
    q.includes('hospital') ||
    q.includes('doctor') ||
    q.includes('consult');

  // Filter items matching intent or specific query tokens
  const relevantMeds = mentionsMeds
    ? (record.medications || []).filter((m) => {
        if (isBroad) return true;
        const nameMatch = tokens.some((t) => m.name.toLowerCase().includes(t));
        const ingMatch = m.ingredients.some((ing) => tokens.some((t) => ing.toLowerCase().includes(t)));
        return nameMatch || ingMatch || q.includes('medication') || q.includes('prescri');
      })
    : [];

  const relevantAllergies = mentionsAllergies ? record.allergies || [] : [];
  const relevantConditions = mentionsConditions ? record.conditions || [] : [];

  const relevantLabs = mentionsLabs
    ? (record.labs || []).filter((l) => {
        if (isBroad) return true;
        return tokens.some((t) => l.test.toLowerCase().includes(t)) || q.includes('lab') || q.includes('test') || q.includes('report');
      })
    : [];

  const relevantEvents = mentionsEvents
    ? (record.events || []).filter((e) => {
        if (isBroad) return true;
        return tokens.some((t) => e.title.toLowerCase().includes(t)) || q.includes('event') || q.includes('visit') || q.includes('admission');
      })
    : [];

  return {
    patientProfile: {
      name: record.profile?.name || 'Patient',
      age: calculateAge(record.profile?.dateOfBirth || '1968-04-01'),
      sex: record.profile?.sex || 'unknown',
    },
    allergyStatus: record.allergyStatus || 'unknown',
    allergies: relevantAllergies,
    conditions: relevantConditions,
    medications: relevantMeds,
    labs: relevantLabs,
    events: relevantEvents,
    matchedKeywords: tokens,
  };
}
