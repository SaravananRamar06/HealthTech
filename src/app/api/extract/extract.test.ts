import { describe, it, expect } from 'vitest';
import { POST as extractRoute } from './route';

describe('Extract API Route', () => {
  it('returns cached demo extraction when demoDocId is provided', async () => {
    const formData = new FormData();
    formData.append('demoDocId', 'doc_01');
    formData.append('documentId', 'doc_01');

    const req = new Request('http://localhost:3000/api/extract', {
      method: 'POST',
      body: formData,
    });

    const res = await extractRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.document.title).toContain('Discharge Summary');
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.mode).toBe('cached-demo');

    // Verify excerpt exists on all items
    data.items.forEach((item: { excerpt: string; confidence: string }) => {
      expect(item.excerpt).toBeDefined();
      expect(item.excerpt.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(item.confidence);
    });
  });

  it('rejects empty request without files or demoDocId', async () => {
    const formData = new FormData();
    const req = new Request('http://localhost:3000/api/extract', {
      method: 'POST',
      body: formData,
    });

    const res = await extractRoute(req);
    expect(res.status).toBe(400);
  });

  it('rejects unsupported file types', async () => {
    const formData = new FormData();
    formData.append('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    const req = new Request('http://localhost:3000/api/extract', {
      method: 'POST',
      body: formData,
    });

    const res = await extractRoute(req);
    expect(res.status).toBe(415);
  });
});
