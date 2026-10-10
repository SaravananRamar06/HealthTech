import { describe, it, expect } from 'vitest';
import { shareStore, sha256 } from './store';
import type { EncryptedShare } from '../types';

describe('ShareStore', () => {
  const shareId = 'test_share_' + Math.random().toString(36).slice(2, 8);
  const token = 'test_manage_token_secret_12345';
  const shareData: EncryptedShare = {
    ciphertext: 'dGVzdF9jaXBoZXJ0ZXh0',
    iv: 'dGVzdF9pdg',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };

  it('creates and retrieves a share', async () => {
    const tokenHash = await sha256(token);
    await shareStore.createShare(shareId, shareData, tokenHash, 3600);

    const { share, revoked } = await shareStore.getShare(shareId);
    expect(revoked).toBe(false);
    expect(share).toEqual(shareData);
  });

  it('records and retrieves access logs with valid token', async () => {
    const tokenHash = await sha256(token);
    await shareStore.recordAccess(shareId, {
      at: '2026-10-10T12:00:00Z',
      ua: 'Mozilla/5.0 Test Browser',
    });

    const logs = await shareStore.getAccessLog(shareId, tokenHash);
    expect(logs).toBeDefined();
    expect(logs?.length).toBe(1);
    expect(logs?.[0].ua).toContain('Test Browser');

    // Wrong token
    const wrongHash = await sha256('wrong_token');
    const unauthorized = await shareStore.getAccessLog(shareId, wrongHash);
    expect(unauthorized).toBeNull();
  });

  it('revokes share and marks it revoked', async () => {
    const tokenHash = await sha256(token);

    // Wrong token fails
    const wrongHash = await sha256('wrong_token');
    const badRevoke = await shareStore.revokeShare(shareId, wrongHash);
    expect(badRevoke).toBe(false);

    // Valid revoke succeeds
    const success = await shareStore.revokeShare(shareId, tokenHash);
    expect(success).toBe(true);

    // After revoke, getShare returns revoked: true and share: null
    const { share, revoked } = await shareStore.getShare(shareId);
    expect(revoked).toBe(true);
    expect(share).toBeNull();
  });
});
