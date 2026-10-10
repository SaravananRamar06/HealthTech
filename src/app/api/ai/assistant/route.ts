import { NextResponse } from 'next/server';
import { AskCareBridgeRequestSchema } from '@/lib/ai/schemas';
import { askCareBridge } from '@/lib/ai/assistant';

export const maxDuration = 45;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = AskCareBridgeRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { query, record, consented, forceDeterministic } = parsed.data;

    if (!record) {
      return NextResponse.json(
        { error: 'No patient record provided' },
        { status: 400 }
      );
    }

    const result = await askCareBridge(query, record, {
      consented,
      forceDeterministic,
    });

    return NextResponse.json(result);
  } catch (err) {
    // Sanitized log: never log patient record or question text
    console.error('[CareBridge API] Assistant error:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json(
      { error: 'Failed to process assistant request' },
      { status: 500 }
    );
  }
}
