import { NextResponse } from 'next/server';
import { ReconciliationRequestSchema } from '@/lib/ai/schemas';
import { reconcileRecords } from '@/lib/ai/reconciliation';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ReconciliationRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { record, today } = parsed.data;

    if (!record) {
      return NextResponse.json(
        { error: 'No patient record provided' },
        { status: 400 }
      );
    }

    const findings = reconcileRecords(record, today || '2026-10-10');

    return NextResponse.json({
      findings,
      mode: 'local',
    });
  } catch (err) {
    console.error('[CareBridge API] Reconciliation error:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json(
      { error: 'Failed to reconcile records' },
      { status: 500 }
    );
  }
}
