import { NextResponse } from 'next/server';
import { AppointmentPrepRequestSchema } from '@/lib/ai/schemas';
import { generateAppointmentPrep } from '@/lib/ai/appointmentPrep';

export const maxDuration = 45;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = AppointmentPrepRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { record, purpose, symptoms, customQuestions, consented, forceDeterministic } = parsed.data;

    if (!record) {
      return NextResponse.json(
        { error: 'No patient record provided' },
        { status: 400 }
      );
    }

    const result = await generateAppointmentPrep(record, {
      purpose,
      symptoms,
      customQuestions,
      consented,
      forceDeterministic,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[CareBridge API] Appointment prep error:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json(
      { error: 'Failed to generate appointment preparation' },
      { status: 500 }
    );
  }
}
