import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEMO_EXTRACTIONS } from '@/lib/extract/demoCache';
import { GeminiExtractionSchema } from '@/lib/extract/schema';
import type { ExtractedItem, ExtractionResult } from '@/lib/types';

export const maxDuration = 60;

const EXTRACTION_SYSTEM_PROMPT = `
You are a specialized medical document extraction system for the "Handover" health platform.
Extract structured clinical facts from the provided prescription, laboratory report, or discharge summary.

Rules:
1. Extract ONLY what is explicitly printed or written in the document.
2. For EVERY extracted fact, copy the exact supporting text verbatim into the 'excerpt' field.
3. If an excerpt cannot be found in the document, DO NOT extract the item.
4. Set confidence to 'high' for clear text/print, 'medium' for slight ambiguity, and 'low' for unclear handwriting.
5. In medications, extract generic ingredients only if explicitly listed.
6. Never invent diagnoses, dosages, or allergies.
7. Return a single JSON object with 'document' (title, docType, date, facility, clinician) and 'items' array.
Types:
- 'medication': data has { name, ingredients, strength, dosage, prescriber, prescribedOn }
- 'allergy': data has { substance, reaction }
- 'condition': data has { name, since }
- 'lab': data has { test, value, unit, refRange, date }
- 'event': data has { type: 'visit'|'admission'|'procedure', title, date, facility }
`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const demoDocId = formData.get('demoDocId') as string | null;
    const documentId = (formData.get('documentId') as string) || `doc_${Date.now()}`;
    const file = formData.get('file') as File | null;

    // 1. If explicit demoDocId requested, return the cached demo extraction directly
    if (demoDocId && DEMO_EXTRACTIONS[demoDocId]) {
      const demoResult = DEMO_EXTRACTIONS[demoDocId];
      return NextResponse.json({
        ...demoResult,
        items: demoResult.items.map((item) => ({
          ...item,
          documentId,
        })),
        mode: 'cached-demo',
      } satisfies ExtractionResult);
    }

    // 2. If no file provided and documentId matches demo, use cache
    if (!file && DEMO_EXTRACTIONS[documentId]) {
      return NextResponse.json(DEMO_EXTRACTIONS[documentId]);
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file or valid demoDocId provided' },
        { status: 400 }
      );
    }

    // Size limit: 4.5 MB
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 4.5 MB limit' },
        { status: 413 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 3. Live extraction with Gemini API if key is present
    if (apiKey) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type || 'image/jpeg';

        const client = new GoogleGenAI({ apiKey });

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            EXTRACTION_SYSTEM_PROMPT,
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '{}';
        const parsedJson = JSON.parse(rawText);
        const validated = GeminiExtractionSchema.parse(parsedJson);

        const extractedItems: ExtractedItem[] = validated.items
          .filter((item) => item.excerpt && item.excerpt.trim().length > 0)
          .map((item, idx) => ({
            tempId: `temp_${documentId}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
            documentId,
            excerpt: item.excerpt,
            confidence: item.confidence,
            type: item.type,
            data: item.data,
          } as unknown as ExtractedItem));

        return NextResponse.json({
          document: validated.document,
          items: extractedItems,
          mode: 'live',
        } satisfies ExtractionResult);
      } catch (geminiErr) {
        console.error('Gemini extraction failed, evaluating fallback:', geminiErr);
        // Fall back to matching demo cache if available
      }
    }

    // 4. Fallback to demo cache by matching filename or default to doc_01
    const filename = file.name.toLowerCase();
    let matchedDemoId = 'doc_01';
    if (filename.includes('02') || filename.includes('rx') || filename.includes('iyer')) {
      matchedDemoId = 'doc_02';
    } else if (filename.includes('03') || filename.includes('apr') || (filename.includes('lab') && filename.includes('pdf'))) {
      matchedDemoId = 'doc_03';
    } else if (filename.includes('04') || filename.includes('menon') || filename.includes('dia')) {
      matchedDemoId = 'doc_04';
    } else if (filename.includes('05') || filename.includes('sep') || filename.includes('recent')) {
      matchedDemoId = 'doc_05';
    }

    const fallbackResult = DEMO_EXTRACTIONS[matchedDemoId] || DEMO_EXTRACTIONS['doc_01'];
    return NextResponse.json({
      ...fallbackResult,
      items: fallbackResult.items.map((item) => ({
        ...item,
        documentId,
      })),
      mode: 'cached-demo',
    } satisfies ExtractionResult);
  } catch (err) {
    console.error('Error in /api/extract:', err);
    return NextResponse.json({ error: 'Failed to extract document' }, { status: 500 });
  }
}
