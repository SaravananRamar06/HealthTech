import { Redis } from '@upstash/redis';
import type { AccessEvent, EncryptedShare } from '../types';

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ShareStore {
  createShare(
    id: string,
    share: EncryptedShare,
    manageTokenHash: string,
    ttlSeconds: number
  ): Promise<void>;
  getShare(id: string): Promise<{ share: EncryptedShare | null; revoked: boolean }>;
  recordAccess(id: string, event: AccessEvent, ttlSeconds?: number): Promise<void>;
  getAccessLog(id: string, manageTokenHash: string): Promise<AccessEvent[] | null>;
  revokeShare(id: string, manageTokenHash: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// In-Memory Store (for local dev, tests, and when Redis env vars are absent)
// ---------------------------------------------------------------------------

class MemoryShareStore implements ShareStore {
  private shares = new Map<string, { share: EncryptedShare; expiresTimestamp: number }>();
  private auth = new Map<string, string>(); // id -> manageTokenHash
  private logs = new Map<string, AccessEvent[]>();
  private revoked = new Set<string>();

  async createShare(
    id: string,
    share: EncryptedShare,
    manageTokenHash: string,
    ttlSeconds: number
  ): Promise<void> {
    const expiresTimestamp = Date.now() + ttlSeconds * 1000;
    this.shares.set(id, { share, expiresTimestamp });
    this.auth.set(id, manageTokenHash);
    this.logs.set(id, []);
  }

  async getShare(id: string): Promise<{ share: EncryptedShare | null; revoked: boolean }> {
    if (this.revoked.has(id)) {
      return { share: null, revoked: true };
    }
    const entry = this.shares.get(id);
    if (!entry) {
      return { share: null, revoked: false };
    }
    if (Date.now() > entry.expiresTimestamp) {
      this.shares.delete(id);
      return { share: null, revoked: false };
    }
    return { share: entry.share, revoked: false };
  }

  async recordAccess(id: string, event: AccessEvent): Promise<void> {
    const log = this.logs.get(id) || [];
    log.push(event);
    this.logs.set(id, log);
  }

  async getAccessLog(id: string, manageTokenHash: string): Promise<AccessEvent[] | null> {
    const expectedHash = this.auth.get(id);
    if (!expectedHash || expectedHash !== manageTokenHash) {
      return null;
    }
    return this.logs.get(id) || [];
  }

  async revokeShare(id: string, manageTokenHash: string): Promise<boolean> {
    const expectedHash = this.auth.get(id);
    if (!expectedHash || expectedHash !== manageTokenHash) {
      return false;
    }
    this.shares.delete(id);
    this.revoked.add(id);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis Store
// ---------------------------------------------------------------------------

class RedisShareStore implements ShareStore {
  private redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async createShare(
    id: string,
    share: EncryptedShare,
    manageTokenHash: string,
    ttlSeconds: number
  ): Promise<void> {
    const logTtl = ttlSeconds + 7 * 86400; // access log retained for 7 extra days
    await Promise.all([
      this.redis.set(`share:${id}`, JSON.stringify(share), { ex: ttlSeconds }),
      this.redis.set(`share:${id}:auth`, manageTokenHash, { ex: logTtl }),
      this.redis.set(`share:${id}:log`, JSON.stringify([]), { ex: logTtl }),
    ]);
  }

  async getShare(id: string): Promise<{ share: EncryptedShare | null; revoked: boolean }> {
    const isRevoked = await this.redis.get(`share:${id}:revoked`);
    if (isRevoked) {
      return { share: null, revoked: true };
    }
    const raw = await this.redis.get<string | object>(`share:${id}`);
    if (!raw) {
      return { share: null, revoked: false };
    }
    const share = typeof raw === 'string' ? (JSON.parse(raw) as EncryptedShare) : (raw as EncryptedShare);
    return { share, revoked: false };
  }

  async recordAccess(id: string, event: AccessEvent, ttlSeconds = 7 * 86400): Promise<void> {
    const raw = await this.redis.get<string | AccessEvent[]>(`share:${id}:log`);
    const logs: AccessEvent[] = raw
      ? typeof raw === 'string'
        ? JSON.parse(raw)
        : raw
      : [];
    logs.push(event);
    await this.redis.set(`share:${id}:log`, JSON.stringify(logs), { ex: ttlSeconds });
  }

  async getAccessLog(id: string, manageTokenHash: string): Promise<AccessEvent[] | null> {
    const storedHash = await this.redis.get<string>(`share:${id}:auth`);
    if (!storedHash || storedHash !== manageTokenHash) {
      return null;
    }
    const raw = await this.redis.get<string | AccessEvent[]>(`share:${id}:log`);
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  async revokeShare(id: string, manageTokenHash: string): Promise<boolean> {
    const storedHash = await this.redis.get<string>(`share:${id}:auth`);
    if (!storedHash || storedHash !== manageTokenHash) {
      return false;
    }
    await Promise.all([
      this.redis.del(`share:${id}`),
      this.redis.set(`share:${id}:revoked`, '1', { ex: 7 * 86400 }),
    ]);
    return true;
  }
}

// Global singleton to persist in memory across Next.js dev hot reloads
const globalStore = globalThis as unknown as { __shareStore?: ShareStore };

function initShareStore(): ShareStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return new RedisShareStore(url, token);
  }
  if (!globalStore.__shareStore) {
    globalStore.__shareStore = new MemoryShareStore();
  }
  return globalStore.__shareStore;
}

export const shareStore: ShareStore = initShareStore();
