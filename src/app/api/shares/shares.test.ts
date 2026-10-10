import { describe, it, expect } from 'vitest';
import { POST as createShareRoute } from './route';
import { GET as getShareRoute, DELETE as deleteShareRoute } from './[id]/route';
import { GET as getAccessRoute } from './[id]/access/route';

describe('Shares API Routes', () => {
  it('creates, retrieves, logs access, and revokes a share via route handlers', async () => {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    // 1. POST /api/shares
    const postReq = new Request('http://localhost:3000/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ciphertext: 'base64url_encrypted_ciphertext_data',
        iv: 'base64url_iv_data',
        expiresAt,
      }),
    });

    const postRes = await createShareRoute(postReq);
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.id).toBeDefined();
    expect(postData.manageToken).toBeDefined();

    const shareId = postData.id;
    const manageToken = postData.manageToken;

    // 2. GET /api/shares/[id]
    const getReq = new Request(`http://localhost:3000/api/shares/${shareId}`, {
      headers: { 'User-Agent': 'Vitest-Test-Agent/1.0' },
    });
    const getRes = await getShareRoute(getReq, {
      params: Promise.resolve({ id: shareId }),
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.ciphertext).toBe('base64url_encrypted_ciphertext_data');

    // 3. GET /api/shares/[id]/access (with valid token)
    const accessReq = new Request(`http://localhost:3000/api/shares/${shareId}/access`, {
      headers: { Authorization: `Bearer ${manageToken}` },
    });
    const accessRes = await getAccessRoute(accessReq, {
      params: Promise.resolve({ id: shareId }),
    });
    expect(accessRes.status).toBe(200);
    const accessData = await accessRes.json();
    expect(accessData.events.length).toBeGreaterThan(0);
    expect(accessData.events[0].ua).toContain('Vitest-Test-Agent');

    // 4. DELETE /api/shares/[id] (revoke)
    const deleteReq = new Request(`http://localhost:3000/api/shares/${shareId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${manageToken}` },
    });
    const deleteRes = await deleteShareRoute(deleteReq, {
      params: Promise.resolve({ id: shareId }),
    });
    expect(deleteRes.status).toBe(204);

    // 5. Subsequent GET /api/shares/[id] returns 410 Revoked
    const getRevokedRes = await getShareRoute(getReq, {
      params: Promise.resolve({ id: shareId }),
    });
    expect(getRevokedRes.status).toBe(410);
    const revokedData = await getRevokedRes.json();
    expect(revokedData.reason).toBe('revoked');
  });

  it('rejects invalid inputs on POST /api/shares', async () => {
    const badReq = new Request('http://localhost:3000/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await createShareRoute(badReq);
    expect(res.status).toBe(400);
  });

  it('rejects malformed ids (no Redis key suffix probing) and malformed iv, and sets no-store', async () => {
    const res = await getShareRoute(new Request('http://localhost:3000/api/shares/abc:log'), {
      params: Promise.resolve({ id: 'abc:log' }),
    });
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');

    const badIv = await createShareRoute(
      new Request('http://localhost:3000/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext: 'abc',
          iv: 'x'.repeat(100),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      })
    );
    expect(badIv.status).toBe(400);
  });
});
