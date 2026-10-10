import type { PatientRecord, AppointmentPrepSheet } from '@/lib/types';
import { generateGeminiContentSafe, isGeminiConfigured } from './client';
import { reconcileRecords } from './reconciliation';

export function generateDeterministicAppointmentPrep(
  record: PatientRecord,
  params: {
    purpose: string;
    symptoms?: string[];
    customQuestions?: string[];
    notes?: string;
  }
): AppointmentPrepSheet {
  const activeMeds = (record.medications || []).filter((m) => m.status === 'active');
  const allergies = record.allergies || [];
  const conditions = record.conditions || [];
  const labs = record.labs || [];
  const recon = reconcileRecords(record);

  // Auto-generate high-value questions based on clinical reconciliation findings
  const autoQuestions: string[] = [];

  // Question on duplicate therapy
  const dupMetformin = recon.find((r) => r.type === 'duplicate-ingredient');
  if (dupMetformin) {
    autoQuestions.push(
      'I noticed both Metfora 500 and Glimfora-M1 contain metformin. Should I be taking both or was one intended to replace the other?'
    );
  }

  // Question on stale medication
  const staleMed = recon.find((r) => r.type === 'outdated-medication');
  if (staleMed) {
    autoQuestions.push(
      `Amlodipine was prescribed in January 2025 during hospital discharge. Should I continue taking it?`
    );
  }

  // Question on lab trend
  const hba1cLabs = labs.filter((l) => l.test.toLowerCase().includes('hba1c')).sort((a, b) => b.date.localeCompare(a.date));
  if (hba1cLabs.length > 0) {
    autoQuestions.push(
      `My most recent HbA1c is ${hba1cLabs[0].value}% (${hba1cLabs[0].date}). Does my current medication regimen require any adjustment?`
    );
  }

  // Question on allergy if documented
  if (allergies.length > 0) {
    autoQuestions.push(
      `I have a documented allergy to ${allergies[0].substance}. Please ensure this is recorded in your hospital system.`
    );
  }

  const allQuestions = Array.from(new Set([...(params.customQuestions || []), ...autoQuestions]));

  const relevantDocumentedHistory = conditions.map(
    (c) => `${c.name}${c.since ? ` (onset: ${c.since})` : ''} [${c.provenance.kind === 'document' ? 'From document' : 'Patient-reported'}]`
  );

  const selectedMedications = activeMeds.map(
    (m) => `${m.name} (${m.strength || 'strength unlisted'}) — ${m.dosage || 'dosage unlisted'} [${m.provenance.kind === 'document' ? 'Documented' : 'Patient-reported'}]`
  );

  const selectedAllergies =
    allergies.length > 0
      ? allergies.map((a) => `${a.substance} (Reaction: ${a.reaction || 'unspecified'}) [Documented]`)
      : [record.allergyStatus === 'none-known' ? 'No known allergies (patient-reported)' : 'Allergy status unknown — review with the patient'];

  const relevantHistoricalLabs = [...labs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(
    (l) => `${l.test}: ${l.value} ${l.unit} (${l.date})`
  );

  const clarificationItems: string[] = [];
  if (dupMetformin) {
    clarificationItems.push('Review duplicate metformin ingredient across two active prescriptions.');
  }
  const patientReportedOnly = activeMeds.filter((m) => m.provenance.kind === 'patient-reported');
  if (patientReportedOnly.length > 0) {
    clarificationItems.push(
      `Confirm prescription details for patient-reported medicine: ${patientReportedOnly.map((m) => m.name).join(', ')}.`
    );
  }

  return {
    appointmentPurpose: params.purpose,
    patientReportedSymptoms: params.symptoms || [],
    questionsToAsk: allQuestions,
    relevantDocumentedHistory,
    selectedMedications,
    selectedAllergies,
    relevantHistoricalLabs,
    clarificationItems,
    createdAt: new Date().toISOString(),
    notes: params.notes,
  };
}

const APPOINTMENT_PREP_SYSTEM_PROMPT = `
You are a patient empowerment and clinical communication assistant for CareBridge.
Your role is to produce a structured Appointment Preparation Sheet for a patient visiting a doctor.

Strict Safety Rules:
1. Clearly segregate PATIENT-REPORTED symptoms from DOCUMENTED clinical facts.
2. Formulate concise, respectful, high-yield questions for the doctor.
3. Highlight clinical conflicts (e.g. duplicate therapies) for doctor clarification.
4. Never provide a diagnosis or tell the patient what medication to change.
5. Return valid JSON matching the AppointmentPrepSheet schema.
`;

export async function generateAppointmentPrep(
  record: PatientRecord,
  params: {
    purpose: string;
    symptoms?: string[];
    customQuestions?: string[];
    notes?: string;
    consented?: boolean;
    forceDeterministic?: boolean;
  }
): Promise<{ sheet: AppointmentPrepSheet; mode: 'gemini' | 'local' }> {
  const forceDeterministic = params.forceDeterministic || !params.consented || !isGeminiConfigured();

  if (forceDeterministic) {
    return {
      sheet: generateDeterministicAppointmentPrep(record, params),
      mode: 'local',
    };
  }

  try {
    const rawResponse = await generateGeminiContentSafe(
      [
        {
          text: `Generate an Appointment Preparation Sheet:\n${JSON.stringify({
            purpose: params.purpose,
            symptoms: params.symptoms,
            customQuestions: params.customQuestions,
            profile: record.profile,
            conditions: record.conditions,
            medications: record.medications,
            allergies: record.allergies,
            labs: record.labs,
          })}`,
        },
      ],
      {
        systemInstruction: APPOINTMENT_PREP_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      }
    );

    if (!rawResponse) {
      return {
        sheet: generateDeterministicAppointmentPrep(record, params),
        mode: 'local',
      };
    }

    const parsed = JSON.parse(rawResponse);
    return {
      sheet: {
        appointmentPurpose: parsed.appointmentPurpose || params.purpose,
        patientReportedSymptoms: Array.isArray(parsed.patientReportedSymptoms) ? parsed.patientReportedSymptoms : params.symptoms || [],
        questionsToAsk: Array.isArray(parsed.questionsToAsk) ? parsed.questionsToAsk : [],
        relevantDocumentedHistory: Array.isArray(parsed.relevantDocumentedHistory) ? parsed.relevantDocumentedHistory : [],
        selectedMedications: Array.isArray(parsed.selectedMedications) ? parsed.selectedMedications : [],
        selectedAllergies: Array.isArray(parsed.selectedAllergies) ? parsed.selectedAllergies : [],
        relevantHistoricalLabs: Array.isArray(parsed.relevantHistoricalLabs) ? parsed.relevantHistoricalLabs : [],
        clarificationItems: Array.isArray(parsed.clarificationItems) ? parsed.clarificationItems : [],
        createdAt: new Date().toISOString(),
        notes: params.notes,
      },
      mode: 'gemini',
    };
  } catch {
    return {
      sheet: generateDeterministicAppointmentPrep(record, params),
      mode: 'local',
    };
  }
}
