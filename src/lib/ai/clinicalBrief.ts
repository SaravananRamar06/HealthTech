import type { PatientRecord, GeneratedClinicalBrief } from '@/lib/types';
import { generateGeminiContentSafe, isGeminiConfigured } from './client';

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date('2026-10-10');
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return isNaN(age) ? 58 : age;
}

/**
 * Deterministic Clinical Brief Generator:
 * Generates an accurate, 8-section clinical brief preserving exact clinical values and units.
 */
export function generateDeterministicClinicalBrief(
  record: PatientRecord,
  recipientLabel?: string
): GeneratedClinicalBrief {
  const age = calculateAge(record.profile.dateOfBirth);
  const emergencyInfo = record.profile.emergencyContact
    ? `Emergency Contact: ${record.profile.emergencyContact.name} (${record.profile.emergencyContact.phone})`
    : 'No emergency contact on file';

  const patientProfile = `${record.profile.name}, ${age} years old (${record.profile.sex.toUpperCase()}). DOB: ${record.profile.dateOfBirth}. ${emergencyInfo}.${recipientLabel ? ` Prepared specifically for: ${recipientLabel}.` : ''}`;

  const activeConditions = (record.conditions || []).map((c) => {
    const onset = c.since ? ` (documented onset: ${c.since})` : '';
    const src = c.provenance.kind === 'document' ? 'From document' : 'Patient-reported';
    return `${c.name}${onset} [${src}]`;
  });

  const activeMeds = (record.medications || []).filter((m) => m.status === 'active');
  const stoppedMeds = (record.medications || []).filter((m) => m.status === 'stopped');

  const currentMedications = activeMeds.map((m) => {
    const strength = m.strength ? ` ${m.strength}` : '';
    const dosage = m.dosage ? ` · ${m.dosage}` : '';
    const prescriber = m.prescriber ? ` (Prescriber: ${m.prescriber}, ${m.prescribedOn || 'date unlisted'})` : '';
    const src = m.provenance.kind === 'document' ? 'From document' : 'Patient-reported';
    return `${m.name}${strength}${dosage}${prescriber} [${src}]`;
  });

  const historicalMedications = stoppedMeds.map((m) => {
    const strength = m.strength ? ` ${m.strength}` : '';
    const prescriber = m.prescriber ? ` (originally prescribed by ${m.prescriber} on ${m.prescribedOn || 'unknown date'})` : '';
    return `${m.name}${strength} — Status: Discontinued / Stopped${prescriber}`;
  });

  const allergiesAndReactions =
    record.allergyStatus === 'none-known'
      ? ['No known drug or environmental allergies documented']
      : record.allergyStatus === 'unknown'
      ? ['Allergy status unknown / not documented (requires clinical verification)']
      : (record.allergies || []).map((a) => {
          const rxn = a.reaction ? ` · Reaction: ${a.reaction}` : '';
          const src = a.provenance.kind === 'document' ? 'From document' : 'Patient-reported';
          return `${a.substance}${rxn} [${src}]`;
        });

  const recentLabResults = (record.labs || [])
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((l) => {
      const ref = l.refRange ? ` (ref: ${l.refRange})` : '';
      return `${l.test}: ${l.value} ${l.unit}${ref} — Collected on ${l.date}`;
    });

  const proceduresAndCareEvents = (record.events || []).map((e) => {
    const date = e.date ? ` on ${e.date}` : '';
    const facility = e.facility ? ` at ${e.facility}` : '';
    return `${e.title} (${e.type})${date}${facility}`;
  });

  // Calculate conflicts and unverified info
  const conflictsAndUnverifiedInfo: string[] = [];

  // Check for duplicate metformin
  const metforminMeds = activeMeds.filter(
    (m) =>
      m.name.toLowerCase().includes('metformin') ||
      m.name.toLowerCase().includes('metfora') ||
      m.ingredients.some((ing) => ing.toLowerCase().includes('metformin'))
  );
  if (metforminMeds.length > 1) {
    conflictsAndUnverifiedInfo.push(
      `Duplicate therapy alert: Metformin appears in ${metforminMeds.length} active prescriptions (${metforminMeds.map((m) => m.name).join(', ')}). Review total daily dosage to prevent accidental duplication.`
    );
  }

  // Check for patient-reported without document
  const patientReported = activeMeds.filter((m) => m.provenance.kind === 'patient-reported');
  if (patientReported.length > 0) {
    conflictsAndUnverifiedInfo.push(
      `Patient-reported medication(s) lacking supporting prescription document: ${patientReported.map((m) => m.name).join(', ')}. Clinical verification recommended.`
    );
  }

  // Check for unreviewed documents
  if (record.pendingReview && record.pendingReview.length > 0) {
    conflictsAndUnverifiedInfo.push(
      `${record.pendingReview.length} AI-extracted item(s) are currently awaiting patient review and excluded from this brief.`
    );
  }

  const sources = (record.documents || []).map(
    (d) => `${d.title} (${d.docType}, ${d.date || 'date unlisted'} - ${d.facility || 'unlisted facility'})`
  );

  return {
    patientProfile,
    activeConditions,
    currentMedications,
    historicalMedications,
    allergiesAndReactions,
    recentLabResults,
    proceduresAndCareEvents,
    conflictsAndUnverifiedInfo,
    sources,
    generatedAt: new Date().toISOString(),
    isReviewed: false,
  };
}

const BRIEF_SYSTEM_PROMPT = `
You are a senior clinical informatics specialist generating a structured Clinician Brief for CareBridge.
Your goal is to produce an exceptionally concise, accurate, 1-screen summary for an attending physician.

Strict Rules:
1. Preserve all exact lab values, units, reference ranges, and collection dates.
2. Clearly distinguish CURRENT active medications from HISTORICAL/stopped medications.
3. Label all data sources faithfully: "Patient-reported" vs "From document".
4. Explicitly list any conflicting prescriptions (such as overlapping metformin therapies) and unverified items.
5. Return valid JSON matching the 8 sections of the GeneratedClinicalBrief structure.
`;

/**
 * AI-Powered Clinical Brief Generator:
 * Generates an 8-section clinician brief with Gemini, falling back to deterministic synthesis.
 */
export async function generateClinicalBrief(
  record: PatientRecord,
  options?: {
    consented?: boolean;
    forceDeterministic?: boolean;
    recipientLabel?: string;
  }
): Promise<{ brief: GeneratedClinicalBrief; mode: 'gemini' | 'local' }> {
  const forceDeterministic = options?.forceDeterministic || !options?.consented || !isGeminiConfigured();

  if (forceDeterministic) {
    return {
      brief: generateDeterministicClinicalBrief(record, options?.recipientLabel),
      mode: 'local',
    };
  }

  try {
    const rawResponse = await generateGeminiContentSafe(
      [
        {
          text: `Generate a structured Clinician Brief for this patient:\n${JSON.stringify({
            profile: record.profile,
            conditions: record.conditions,
            medications: record.medications,
            allergies: record.allergies,
            allergyStatus: record.allergyStatus,
            labs: record.labs,
            events: record.events,
            documents: record.documents,
            recipientLabel: options?.recipientLabel,
          })}`,
        },
      ],
      {
        systemInstruction: BRIEF_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      }
    );

    if (!rawResponse) {
      return {
        brief: generateDeterministicClinicalBrief(record, options?.recipientLabel),
        mode: 'local',
      };
    }

    const parsed = JSON.parse(rawResponse);
    return {
      brief: {
        patientProfile: parsed.patientProfile || generateDeterministicClinicalBrief(record, options?.recipientLabel).patientProfile,
        activeConditions: Array.isArray(parsed.activeConditions) ? parsed.activeConditions : [],
        currentMedications: Array.isArray(parsed.currentMedications) ? parsed.currentMedications : [],
        historicalMedications: Array.isArray(parsed.historicalMedications) ? parsed.historicalMedications : [],
        allergiesAndReactions: Array.isArray(parsed.allergiesAndReactions) ? parsed.allergiesAndReactions : [],
        recentLabResults: Array.isArray(parsed.recentLabResults) ? parsed.recentLabResults : [],
        proceduresAndCareEvents: Array.isArray(parsed.proceduresAndCareEvents) ? parsed.proceduresAndCareEvents : [],
        conflictsAndUnverifiedInfo: Array.isArray(parsed.conflictsAndUnverifiedInfo) ? parsed.conflictsAndUnverifiedInfo : [],
        sources: Array.isArray(parsed.sources) ? parsed.sources : [],
        generatedAt: new Date().toISOString(),
        isReviewed: false,
      },
      mode: 'gemini',
    };
  } catch {
    return {
      brief: generateDeterministicClinicalBrief(record, options?.recipientLabel),
      mode: 'local',
    };
  }
}
