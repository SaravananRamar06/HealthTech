import { z } from 'zod';

export const DocumentMetadataSchema = z.object({
  title: z.string(),
  docType: z.enum(['prescription', 'lab-report', 'discharge-summary', 'other']),
  date: z.string().nullable(),
  facility: z.string().nullable(),
  clinician: z.string().nullable(),
});

export const RawExtractedItemSchema = z.object({
  type: z.enum(['medication', 'allergy', 'condition', 'lab', 'event']),
  excerpt: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  data: z.union([
    z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      strength: z.string().nullable().optional(),
      dosage: z.string().nullable().optional(),
      prescriber: z.string().nullable().optional(),
      prescribedOn: z.string().nullable().optional(),
    }),
    z.object({
      substance: z.string(),
      reaction: z.string().nullable().optional(),
    }),
    z.object({
      name: z.string(),
      since: z.string().nullable().optional(),
    }),
    z.object({
      test: z.string(),
      value: z.number(),
      unit: z.string(),
      refRange: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
    }),
    z.object({
      type: z.enum(['visit', 'admission', 'procedure']),
      title: z.string(),
      date: z.string().nullable().optional(),
      facility: z.string().nullable().optional(),
    }),
  ]),
});

export const GeminiExtractionSchema = z.object({
  document: DocumentMetadataSchema,
  items: z.array(RawExtractedItemSchema),
});

export type GeminiExtraction = z.infer<typeof GeminiExtractionSchema>;
