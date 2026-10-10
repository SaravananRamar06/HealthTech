// Shared contract for the whole team. Owner: P1.
// Change only via P1 and announce every change in team chat.

export type ISODate = string; // 'YYYY-MM-DD'
export type Confidence = 'high' | 'medium' | 'low';

export type Provenance =
  | { kind: 'patient-reported' }
  | { kind: 'document'; documentId: string; excerpt: string; confidence: Confidence; edited: boolean };

export interface Medication {
  id: string;
  name: string; // as written, e.g. 'Glimfora-M1'
  ingredients: string[]; // generic names as printed, e.g. ['glimepiride', 'metformin']
  strength: string | null;
  dosage: string | null; // as written, e.g. '1 tab twice daily after food'
  prescriber: string | null;
  prescribedOn: ISODate | null;
  status: 'active' | 'stopped';
  provenance: Provenance;
}

export interface Allergy {
  id: string;
  substance: string;
  reaction: string | null;
  provenance: Provenance;
}

export interface Condition {
  id: string;
  name: string;
  since: ISODate | null;
  provenance: Provenance;
}

export interface LabResult {
  id: string;
  test: string;
  value: number;
  unit: string;
  refRange: string | null;
  date: ISODate;
  provenance: Provenance;
}

export interface CareEvent {
  id: string;
  type: 'visit' | 'admission' | 'procedure';
  title: string;
  date: ISODate | null;
  facility: string | null;
  provenance: Provenance;
}

export interface SourceDocument {
  id: string;
  title: string;
  docType: 'prescription' | 'lab-report' | 'discharge-summary' | 'other';
  date: ISODate | null;
  facility: string | null;
  clinician: string | null;
  fileRef: string; // '/demo/x.jpg' for bundled demo files, 'idb:<key>' for uploads
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface PatientRecord {
  version: 1;
  isDemo: boolean;
  profile: {
    name: string;
    dateOfBirth: ISODate;
    sex: 'female' | 'male' | 'other';
    emergencyContact: EmergencyContact | null;
  };
  allergyStatus: 'unknown' | 'none-known' | 'has-allergies';
  allergies: Allergy[];
  conditions: Condition[];
  medications: Medication[];
  labs: LabResult[];
  events: CareEvent[];
  documents: SourceDocument[];
  pendingReview: ExtractedItem[]; // AI output not yet reviewed: NEVER shared
}

type Fields<T> = Omit<T, 'id' | 'provenance'>;

export type ExtractedItem = {
  tempId: string;
  documentId: string;
  excerpt: string;
  confidence: Confidence;
} & (
  | { type: 'medication'; data: Omit<Fields<Medication>, 'status'> }
  | { type: 'allergy'; data: Fields<Allergy> }
  | { type: 'condition'; data: Fields<Condition> }
  | { type: 'lab'; data: Omit<Fields<LabResult>, 'date'> & { date: ISODate | null } } // null → document date
  | { type: 'event'; data: Fields<CareEvent> }
);

export type ExtractedItemType = ExtractedItem['type'];

export interface ExtractionResult {
  document: Omit<SourceDocument, 'id' | 'fileRef'>;
  items: ExtractedItem[];
  mode: 'live' | 'cached-demo';
}

export type FlagType =
  | 'duplicate-ingredient'
  | 'allergy-med-match'
  | 'possibly-outdated'
  | 'allergy-status-unknown'
  | 'pending-review'
  | 'recent-result'
  | 'patient-reported-only';

export interface Flag {
  type: FlagType;
  severity: 'review' | 'info';
  title: string;
  detail: string;
  itemIds: string[];
}

export type ShareSection = 'allergies' | 'conditions' | 'medications' | 'labs' | 'events' | 'emergencyContact';

export interface ShareSelection {
  sections: ShareSection[];
  excludedIds: string[];
  recipientLabel: string;
  expiresAt: string; // ISO timestamp
}

export interface SharePayload {
  v: 1;
  isDemo: boolean;
  createdAt: string;
  expiresAt: string;
  recipientLabel: string;
  patient: { name: string; age: number; sex: string; emergencyContact: EmergencyContact | null };
  allergyStatus: PatientRecord['allergyStatus'];
  allergies: Allergy[];
  conditions: Condition[];
  medications: Medication[];
  labs: LabResult[];
  events: CareEvent[];
  documents: Omit<SourceDocument, 'fileRef'>[]; // metadata only, for the source labels
  flags: Flag[]; // computed on the SHARED subset only, so withheld items never leak
  withheldCount: number; // number of items excluded (a count only)
}

// Encrypted share as stored on the server (P3).
export interface EncryptedShare {
  ciphertext: string; // base64url
  iv: string; // base64url
  expiresAt: string; // ISO timestamp
}

export interface AccessEvent {
  at: string; // ISO timestamp
  ua: string; // coarse user agent
}

// Kept in the patient's localStorage so they can see the log and revoke (P3).
export interface ShareRecord {
  id: string;
  manageToken: string;
  url: string;
  recipientLabel: string;
  createdAt: string;
  expiresAt: string;
  sections: ShareSection[];
  withheldCount: number;
  revokedAt: string | null;
}

// Function contracts (implementations live in the owners' files):
//   analyzeRecord(r: PatientRecord, today: ISODate): Flag[]                          P4 · src/lib/analyze.ts
//   buildSharePayload(r: PatientRecord, s: ShareSelection, now: Date): SharePayload  P3 · src/lib/share/payload.ts
//   useVault() store                                                                 P1 · src/lib/vault.ts
