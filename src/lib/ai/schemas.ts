import { z } from 'zod';

export const RecordCitationSchema = z.object({
  id: z.string(),
  itemType: z.enum(['medication', 'allergy', 'condition', 'lab', 'event', 'document']),
  title: z.string(),
  date: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  provenanceKind: z.enum(['patient-reported', 'document']),
});

export const AskCareBridgeRequestSchema = z.object({
  query: z.string().trim().min(1, 'Query cannot be empty').max(1000, 'Query exceeds maximum length'),
  consented: z.boolean().default(false),
  forceDeterministic: z.boolean().optional().default(false),
  record: z.any(), // PatientRecord object
});

export const AskCareBridgeResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(RecordCitationSchema),
  uncertainty: z.boolean(),
  mode: z.enum(['gemini', 'local']),
});

export const ClinicalBriefRequestSchema = z.object({
  consented: z.boolean().default(false),
  forceDeterministic: z.boolean().optional().default(false),
  recipientLabel: z.string().optional(),
  record: z.any(),
});

export const GeneratedClinicalBriefSchema = z.object({
  patientProfile: z.string(),
  activeConditions: z.array(z.string()),
  currentMedications: z.array(z.string()),
  historicalMedications: z.array(z.string()),
  allergiesAndReactions: z.array(z.string()),
  recentLabResults: z.array(z.string()),
  proceduresAndCareEvents: z.array(z.string()),
  conflictsAndUnverifiedInfo: z.array(z.string()),
  sources: z.array(z.string()),
  generatedAt: z.string(),
  isReviewed: z.boolean().default(false),
});

export const ClinicalBriefResponseSchema = z.object({
  brief: GeneratedClinicalBriefSchema,
  mode: z.enum(['gemini', 'local']),
});

export const ReconciliationRequestSchema = z.object({
  consented: z.boolean().default(false),
  forceDeterministic: z.boolean().optional().default(false),
  today: z.string().optional(),
  record: z.any(),
});

export const ReconciliationFindingSchema = z.object({
  id: z.string(),
  type: z.enum([
    'duplicate-ingredient',
    'conflicting-strength',
    'outdated-medication',
    'lab-discordance',
    'unconfirmed-allergy',
    'demographic-inconsistency',
  ]),
  severity: z.enum(['high', 'medium', 'low']),
  title: z.string(),
  explanation: z.string(),
  records: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.string(),
      source: z.string(),
      date: z.string().nullable(),
    })
  ),
  suggestedResolution: z.string(),
  status: z.enum(['unresolved', 'resolved']),
  resolutionAction: z.enum(['marked-stopped', 'confirmed-both', 'dismissed']).optional(),
});

export const ReconciliationResponseSchema = z.object({
  findings: z.array(ReconciliationFindingSchema),
  mode: z.enum(['gemini', 'local']),
});

export const AppointmentPrepRequestSchema = z.object({
  purpose: z.string().trim().min(1, 'Purpose is required'),
  symptoms: z.array(z.string()).default([]),
  customQuestions: z.array(z.string()).default([]),
  consented: z.boolean().default(false),
  forceDeterministic: z.boolean().optional().default(false),
  record: z.any(),
});

export const AppointmentPrepSheetSchema = z.object({
  appointmentPurpose: z.string(),
  patientReportedSymptoms: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
  relevantDocumentedHistory: z.array(z.string()),
  selectedMedications: z.array(z.string()),
  selectedAllergies: z.array(z.string()),
  relevantHistoricalLabs: z.array(z.string()),
  clarificationItems: z.array(z.string()),
  createdAt: z.string(),
  notes: z.string().optional(),
});

export const AppointmentPrepResponseSchema = z.object({
  sheet: AppointmentPrepSheetSchema,
  mode: z.enum(['gemini', 'local']),
});

export const RecordQualityIssueSchema = z.object({
  id: z.string(),
  category: z.enum([
    'missing-date',
    'missing-unit',
    'incomplete-dosage',
    'unclear-status',
    'unreviewed-extraction',
    'stale-entry',
  ]),
  severity: z.enum(['warning', 'info']),
  title: z.string(),
  detail: z.string(),
  itemId: z.string(),
  itemType: z.enum(['medication', 'allergy', 'condition', 'lab', 'event', 'document']),
  status: z.enum(['pending', 'resolved']),
});
