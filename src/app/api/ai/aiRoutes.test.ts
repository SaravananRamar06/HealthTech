import { describe, it, expect } from 'vitest';
import { POST as assistantRoute } from './assistant/route';
import { POST as briefRoute } from './brief/route';
import { POST as reconcileRoute } from './reconcile/route';
import { POST as appointmentPrepRoute } from './appointment-prep/route';
import demoComplete from '@/lib/demo/demoComplete.json';

describe('CareBridge 2.0 AI API Endpoints', () => {
  it('POST /api/ai/assistant validates query and returns grounded answer with citations', async () => {
    const req = new Request('http://localhost:3000/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Which medications are currently listed in my records?',
        record: demoComplete,
        consented: true,
        forceDeterministic: true,
      }),
    });

    const res = await assistantRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toContain('active medication');
    expect(data.citations.length).toBeGreaterThan(0);
    expect(data.mode).toBe('local');
  });

  it('POST /api/ai/assistant rejects empty query with 400', async () => {
    const req = new Request('http://localhost:3000/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '   ',
        record: demoComplete,
      }),
    });

    const res = await assistantRoute(req);
    expect(res.status).toBe(400);
  });

  it('POST /api/ai/brief returns 8-section clinical brief', async () => {
    const req = new Request('http://localhost:3000/api/ai/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: demoComplete,
        consented: true,
        forceDeterministic: true,
        recipientLabel: 'Dr. Rao',
      }),
    });

    const res = await briefRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.brief.patientProfile).toContain('Meena Krishnan');
    expect(data.brief.recentLabResults.length).toBeGreaterThan(0);
  });

  it('POST /api/ai/reconcile identifies duplicate therapies and trends', async () => {
    const req = new Request('http://localhost:3000/api/ai/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: demoComplete,
        today: '2026-10-10',
      }),
    });

    const res = await reconcileRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.findings.some((f: { type: string }) => f.type === 'duplicate-ingredient')).toBe(true);
  });

  it('POST /api/ai/appointment-prep generates structured appointment sheet', async () => {
    const req = new Request('http://localhost:3000/api/ai/appointment-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: demoComplete,
        purpose: 'Endocrine consultation',
        symptoms: ['Morning fatigue'],
        customQuestions: ['Should I check fasting blood sugar every day?'],
        consented: true,
        forceDeterministic: true,
      }),
    });

    const res = await appointmentPrepRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sheet.appointmentPurpose).toBe('Endocrine consultation');
    expect(data.sheet.patientReportedSymptoms).toContain('Morning fatigue');
  });
});
