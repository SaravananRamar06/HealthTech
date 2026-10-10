import type { SharePayload } from '../types';

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a cryptographically secure 256-bit AES-GCM key.
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey as a base64url string (43 characters).
 */
export async function exportKeyBase64Url(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64Url(raw);
}

/**
 * Import a base64url-encoded 256-bit AES-GCM key.
 */
export async function importKeyBase64Url(keyBase64Url: string): Promise<CryptoKey> {
  const raw = base64UrlToBuffer(keyBase64Url);
  return await crypto.subtle.importKey(
    'raw',
    raw as unknown as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a SharePayload using AES-256-GCM.
 * Generates a random 96-bit (12-byte) IV for each encryption.
 * The encryption key is returned as base64url and never sent to the server.
 */
export async function encryptPayload(
  payload: SharePayload,
  key?: CryptoKey
): Promise<{ ciphertext: string; iv: string; keyBase64Url: string }> {
  const activeKey = key ?? (await generateKey());
  const keyBase64Url = await exportKeyBase64Url(activeKey);

  // 96-bit IV
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(payload));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    activeKey,
    encodedData
  );

  return {
    ciphertext: bufferToBase64Url(cipherBuffer),
    iv: bufferToBase64Url(ivBytes),
    keyBase64Url,
  };
}

/**
 * Decrypt ciphertext using the base64url key and IV.
 * Throws if authentication fails or ciphertext was tampered with.
 */
export async function decryptPayload(
  ciphertext: string,
  iv: string,
  keyBase64Url: string
): Promise<SharePayload> {
  const key = await importKeyBase64Url(keyBase64Url);
  const ivBytes = base64UrlToBuffer(iv);
  const cipherBytes = base64UrlToBuffer(ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as unknown as ArrayBuffer },
    key,
    cipherBytes as unknown as ArrayBuffer
  );

  const decryptedJson = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decryptedJson) as SharePayload;
}
