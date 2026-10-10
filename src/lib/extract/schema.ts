import { z } from 'zod';

export const DocumentMetadataSchema = z.object({
  title: z.string(),
  docType: z.enum(['prescription', 'lab-report', 'discharge-summary', 'other']).catch('other'),
  date: z.string().nullable(),
  facility: z.string().nullable(),
  clinician: z.string().nullable(),
});

const itemBase = {
  excerpt: z.string().trim().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
};

// Discriminated on `type` so that `data` must match the declared item type.
export const RawExtractedItemSchema = z.discriminatedUnion('type', [
  z.object({
    ...itemBase,
    type: z.literal('medication'),
    data: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      strength: z.string().nullable().optional(),
      dosage: z.string().nullable().optional(),
      prescriber: z.string().nullable().optional(),
      prescribedOn: z.string().nullable().optional(),
    }),
  }),
  z.object({
    ...itemBase,
    type: z.literal('allergy'),
    data: z.object({
      substance: z.string(),
      reaction: z.string().nullable().optional(),
    }),
  }),
  z.object({
    ...itemBase,
    type: z.literal('condition'),
    data: z.object({
      name: z.string(),
      since: z.string().nullable().optional(),
    }),
  }),
  z.object({
    ...itemBase,
    type: z.literal('lab'),
    data: z.object({
      test: z.string(),
      value: z.number(),
      unit: z.string(),
      refRange: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
    }),
  }),
  z.object({
    ...itemBase,
    type: z.literal('event'),
    data: z.object({
      type: z.enum(['visit', 'admission', 'procedure']),
      title: z.string(),
      date: z.string().nullable().optional(),
      facility: z.string().nullable().optional(),
    }),
  }),
]);

export const GeminiExtractionSchema = z.object({
  document: DocumentMetadataSchema,
  items: z.array(RawExtractedItemSchema),
});

export type GeminiExtraction = z.infer<typeof GeminiExtractionSchema>;
export type RawExtractedItem = z.infer<typeof RawExtractedItemSchema>;

const LenientExtractionSchema = z.object({
  document: DocumentMetadataSchema,
  items: z.array(z.unknown()),
});

/**
 * Validates the model reply. The document metadata must be valid (throws otherwise),
 * but individual items that fail validation or have no excerpt are dropped
 * instead of failing the whole extraction.
 */
export function parseGeminiExtraction(raw: unknown): GeminiExtraction {
  const lenient = LenientExtractionSchema.parse(raw);
  const items: RawExtractedItem[] = [];
  for (const candidate of lenient.items) {
    const parsed = RawExtractedItemSchema.safeParse(candidate);
    if (parsed.success) items.push(parsed.data);
  }
  return { document: lenient.document, items };
}
