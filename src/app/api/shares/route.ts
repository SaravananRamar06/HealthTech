import { NextResponse } from 'next/server';
import { shareStore, sha256 } from '@/lib/share/store';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ciphertext, iv, expiresAt } = body;

    if (!ciphertext || typeof ciphertext !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid ciphertext' }, { status: 400 });
    }
    if (!iv || typeof iv !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid iv' }, { status: 400 });
    }
    if (!expiresAt || typeof expiresAt !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid expiresAt' }, { status: 400 });
    }

    // Size limit: ciphertext <= 300 KB
    if (ciphertext.length > 300 * 1024) {
      return NextResponse.json({ error: 'Ciphertext exceeds 300KB limit' }, { status: 413 });
    }

    const expiryTime = new Date(expiresAt).getTime();
    const nowTime = Date.now();
    if (isNaN(expiryTime) || expiryTime <= nowTime) {
      return NextResponse.json({ error: 'Expiry must be in the future' }, { status: 400 });
    }

    const maxTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days max
    if (expiryTime - nowTime > maxTtlMs + 60000) {
      return NextResponse.json({ error: 'Expiry cannot exceed 7 days' }, { status: 400 });
    }

    const ttlSeconds = Math.max(60, Math.floor((expiryTime - nowTime) / 1000));

    // 128 random bits for id (16 bytes = 32 hex chars)
    const id = randomHex(16);
    // 256 random bits for manageToken (32 bytes = 64 hex chars)
    const manageToken = randomHex(32);
    const manageTokenHash = await sha256(manageToken);

    await shareStore.createShare(
      id,
      { ciphertext, iv, expiresAt },
      manageTokenHash,
      ttlSeconds
    );

    return NextResponse.json(
      { id, manageToken },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Error creating share:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
