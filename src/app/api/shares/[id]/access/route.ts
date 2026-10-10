import { NextResponse } from 'next/server';
import { shareStore, sha256 } from '@/lib/share/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    const tokenHash = await sha256(token);

    const log = await shareStore.getAccessLog(id, tokenHash);
    if (!log) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 401 });
    }

    return NextResponse.json(
      { events: log },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Error fetching access log:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
