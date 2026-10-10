import { NextResponse } from 'next/server';
import { ClinicalBriefRequestSchema } from '@/lib/ai/schemas';
import { generateClinicalBrief } from '@/lib/ai/clinicalBrief';

export const maxDuration = 45;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ClinicalBriefRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { record, consented, forceDeterministic, recipientLabel } = parsed.data;

    if (!record) {
      return NextResponse.json(
        { error: 'No patient record provided' },
        { status: 400 }
      );
    }

    const result = await generateClinicalBrief(record, {
      consented,
      forceDeterministic,
      recipientLabel,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[CareBridge API] Brief error:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json(
      { error: 'Failed to generate clinician brief' },
      { status: 500 }
    );
  }
}
