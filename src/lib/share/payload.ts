import { analyzeRecord } from '../analyze';
import type {
  Allergy,
  CareEvent,
  Condition,
  ISODate,
  LabResult,
  Medication,
  PatientRecord,
  SharePayload,
  ShareSelection,
  SourceDocument,
} from '../types';

function calculateAge(dob: string, atDate: Date): number {
  const parts = dob.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  const birthYear = parts[0];
  const birthMonth = parts[1] - 1;
  const birthDay = parts[2];

  let age = atDate.getFullYear() - birthYear;
  const currentMonth = atDate.getMonth();
  const currentDay = atDate.getDate();

  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age--;
  }
  return Math.max(0, age);
}

function toISODate(d: Date): ISODate {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pure function: build the scoped SharePayload.
 * Ensures:
 * 1. Only selected sections are included.
 * 2. Excluded items are removed.
 * 3. Pending review items are NEVER included.
 * 4. Flags are computed ONLY on the shared subset (withheld items never leak).
 * 5. Document file references are stripped.
 * 6. Withheld items count is recorded.
 */
export function buildSharePayload(
  record: PatientRecord,
  selection: ShareSelection,
  now: Date
): SharePayload {
  const excludedSet = new Set(selection.excludedIds || []);
  const sectionsSet = new Set(selection.sections || []);

  const totalRecordItems =
    (record.allergies?.length || 0) +
    (record.conditions?.length || 0) +
    (record.medications?.length || 0) +
    (record.labs?.length || 0) +
    (record.events?.length || 0);

  // 1. Filter each section
  const sharedAllergies: Allergy[] = sectionsSet.has('allergies')
    ? (record.allergies || []).filter((a) => !excludedSet.has(a.id))
    : [];

  const sharedConditions: Condition[] = sectionsSet.has('conditions')
    ? (record.conditions || []).filter((c) => !excludedSet.has(c.id))
    : [];

  const sharedMedications: Medication[] = sectionsSet.has('medications')
    ? (record.medications || []).filter((m) => !excludedSet.has(m.id))
    : [];

  const sharedLabs: LabResult[] = sectionsSet.has('labs')
    ? (record.labs || []).filter((l) => !excludedSet.has(l.id))
    : [];

  const sharedEvents: CareEvent[] = sectionsSet.has('events')
    ? (record.events || []).filter((e) => !excludedSet.has(e.id))
    : [];

  const emergencyContact = sectionsSet.has('emergencyContact')
    ? record.profile.emergencyContact
    : null;

  const totalIncludedItems =
    sharedAllergies.length +
    sharedConditions.length +
    sharedMedications.length +
    sharedLabs.length +
    sharedEvents.length;

  const withheldCount = Math.max(0, totalRecordItems - totalIncludedItems);

  // 2. Identify referenced documents and strip fileRef
  const referencedDocIds = new Set<string>();
  const collectDocId = (item: { provenance: { kind: string; documentId?: string } }) => {
    if (item.provenance.kind === 'document' && item.provenance.documentId) {
      referencedDocIds.add(item.provenance.documentId);
    }
  };

  sharedAllergies.forEach(collectDocId);
  sharedConditions.forEach(collectDocId);
  sharedMedications.forEach(collectDocId);
  sharedLabs.forEach(collectDocId);
  sharedEvents.forEach(collectDocId);

  const sharedDocs: Omit<SourceDocument, 'fileRef'>[] = (record.documents || [])
    .filter((doc) => referencedDocIds.has(doc.id))
    .map(({ fileRef, ...metadata }) => {
      void fileRef;
      return metadata;
    });

  // 3. Compute flags on SHARED subset ONLY
  const todayIso = toISODate(now);
  const sharedRecordSubset: PatientRecord = {
    version: 1,
    isDemo: record.isDemo,
    profile: record.profile,
    allergyStatus: sectionsSet.has('allergies') ? record.allergyStatus : 'unknown',
    allergies: sharedAllergies,
    conditions: sharedConditions,
    medications: sharedMedications,
    labs: sharedLabs,
    events: sharedEvents,
    documents: record.documents,
    pendingReview: [], // AI pending items are NEVER part of share or share flags
  };

  const sharedFlags = analyzeRecord(sharedRecordSubset, todayIso);

  return {
    v: 1,
    isDemo: record.isDemo,
    createdAt: now.toISOString(),
    expiresAt: selection.expiresAt,
    recipientLabel: selection.recipientLabel,
    patient: {
      name: record.profile.name,
      age: calculateAge(record.profile.dateOfBirth, now),
      sex: record.profile.sex,
      emergencyContact,
    },
    allergyStatus: sectionsSet.has('allergies') ? record.allergyStatus : 'unknown',
    allergies: sharedAllergies,
    conditions: sharedConditions,
    medications: sharedMedications,
    labs: sharedLabs,
    events: sharedEvents,
    documents: sharedDocs,
    flags: sharedFlags,
    withheldCount,
  };
}
