import { describe, it, expect } from 'vitest';
import { parseGeminiExtraction } from './schema';

const document = { title: 'T', docType: 'prescription', date: null, facility: null, clinician: null };

describe('parseGeminiExtraction', () => {
  it('drops invalid items and items without an excerpt, keeps valid ones', () => {
    const result = parseGeminiExtraction({
      document,
      items: [
        { type: 'allergy', excerpt: 'rash after penicillin', confidence: 'high', data: { substance: 'penicillin', reaction: 'rash' } },
        { type: 'allergy', excerpt: '   ', confidence: 'high', data: { substance: 'x' } },
        { type: 'lab', excerpt: 'HbA1c: x', confidence: 'high', data: { test: 'HbA1c', value: 'x', unit: '%' } },
        { type: 'medication', excerpt: 'foo', confidence: 'high', data: { substance: 'mismatch' } },
      ],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe('allergy');
  });

  it('throws when the document metadata is invalid', () => {
    expect(() => parseGeminiExtraction({ document: {}, items: [] })).toThrow();
  });
});
