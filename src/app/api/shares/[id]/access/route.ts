import { NextResponse } from 'next/server';
import { shareStore, sha256 } from '@/lib/share/store';

const NO_STORE = { 'Cache-Control': 'no-store' };
const ID_PATTERN = /^[0-9a-f]{32}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 401, headers: NO_STORE });
    }

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization bearer token' }, { status: 401, headers: NO_STORE });
    }

    const token = authHeader.slice(7).trim();
    const tokenHash = await sha256(token);

    const log = await shareStore.getAccessLog(id, tokenHash);
    if (!log) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 401, headers: NO_STORE });
    }

    return NextResponse.json(
      { events: log },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error('Error fetching access log:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE });
  }
}
