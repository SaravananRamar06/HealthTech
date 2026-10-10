import { describe, it, expect } from 'vitest';
import { generateKey, exportKeyBase64Url, encryptPayload, decryptPayload } from './crypto';
import type { SharePayload } from '../types';

describe('WebCrypto AES-256-GCM', () => {
  const dummyPayload: SharePayload = {
    v: 1,
    isDemo: true,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    recipientLabel: 'Dr. S. Rao',
    patient: {
      name: 'Meena Krishnan',
      age: 58,
      sex: 'female',
      emergencyContact: { name: 'Priya Krishnan', phone: '+91 98765 43210' },
    },
    allergyStatus: 'has-allergies',
    allergies: [
      {
        id: 'alg-1',
        substance: 'amoxicillin-clavulanate',
        reaction: 'urticaria',
        provenance: { kind: 'patient-reported' },
      },
    ],
    conditions: [],
    medications: [],
    labs: [],
    events: [],
    documents: [],
    flags: [],
    withheldCount: 1,
  };

  it('encrypts and decrypts payload correctly', async () => {
    const { ciphertext, iv, keyBase64Url } = await encryptPayload(dummyPayload);

    expect(ciphertext).toBeDefined();
    expect(iv).toBeDefined();
    expect(keyBase64Url).toBeDefined();
    expect(keyBase64Url.length).toBe(43); // 256 bits = 32 bytes base64url ~43 chars

    const decrypted = await decryptPayload(ciphertext, iv, keyBase64Url);
    expect(decrypted).toEqual(dummyPayload);
  });

  it('fails decryption with wrong key', async () => {
    const { ciphertext, iv } = await encryptPayload(dummyPayload);
    const otherKey = await generateKey();
    const otherKeyBase64Url = await exportKeyBase64Url(otherKey);

    await expect(decryptPayload(ciphertext, iv, otherKeyBase64Url)).rejects.toThrow();
  });

  it('fails decryption with tampered ciphertext', async () => {
    const { ciphertext, iv, keyBase64Url } = await encryptPayload(dummyPayload);
    // Tamper with one character of the ciphertext
    const tampered =
      ciphertext.charAt(0) === 'A'
        ? 'B' + ciphertext.slice(1)
        : 'A' + ciphertext.slice(1);

    await expect(decryptPayload(tampered, iv, keyBase64Url)).rejects.toThrow();
  });

  it('fails decryption with tampered IV', async () => {
    const { ciphertext, iv, keyBase64Url } = await encryptPayload(dummyPayload);
    const tamperedIv =
      iv.charAt(0) === 'A' ? 'B' + iv.slice(1) : 'A' + iv.slice(1);

    await expect(decryptPayload(ciphertext, tamperedIv, keyBase64Url)).rejects.toThrow();
  });
});
