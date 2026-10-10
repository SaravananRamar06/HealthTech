import { NextResponse } from 'next/server';
import { shareStore, sha256 } from '@/lib/share/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { share, revoked } = await shareStore.getShare(id);

    if (revoked) {
      return NextResponse.json(
        { reason: 'revoked' },
        { status: 410, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!share) {
      return NextResponse.json(
        { reason: 'expired-or-missing' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Record access event
    const ua = request.headers.get('user-agent') || 'Unknown browser';
    const event = {
      at: new Date().toISOString(),
      ua: ua.slice(0, 150),
    };
    await shareStore.recordAccess(id, event);

    return NextResponse.json(
      {
        ciphertext: share.ciphertext,
        iv: share.iv,
        expiresAt: share.expiresAt,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Error fetching share:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const revoked = await shareStore.revokeShare(id, tokenHash);
    if (!revoked) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 401 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('Error revoking share:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
