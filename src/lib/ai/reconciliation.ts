import type { PatientRecord, ReconciliationFinding } from '@/lib/types';

function parseISODate(d: string): number {
  const parts = d.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return NaN;
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

function daysBetween(from: string, to: string): number {
  const t1 = parseISODate(from);
  const t2 = parseISODate(to);
  if (isNaN(t1) || isNaN(t2)) return NaN;
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Reconciles patient records to identify multi-prescriber overlaps,
 * conflicting medication strengths, stale therapies, and lab progression.
 */
export function reconcileRecords(
  record: PatientRecord,
  today: string = '2026-10-10'
): ReconciliationFinding[] {
  const findings: ReconciliationFinding[] = [];
  const activeMeds = (record.medications || []).filter((m) => m.status === 'active');

  // 1. Duplicate Ingredient Detection (e.g. Metformin in single-agent and combo)
  const ingredientMap = new Map<string, typeof activeMeds>();
  for (const med of activeMeds) {
    if (!med.ingredients || !med.ingredients.length) continue;
    for (const raw of med.ingredients) {
      const ing = normalize(raw);
      if (!ing) continue;
      const list = ingredientMap.get(ing) || [];
      list.push(med);
      ingredientMap.set(ing, list);
    }
  }

  for (const [ingredient, meds] of ingredientMap.entries()) {
    const distinctNames = new Set(meds.map((m) => normalize(m.name)));
    if (distinctNames.size > 1) {
      findings.push({
        id: `recon_dup_${ingredient}`,
        type: 'duplicate-ingredient',
        severity: 'high',
        title: `Duplicate Therapy: ${ingredient.toUpperCase()}`,
        explanation: `The ingredient "${ingredient}" is actively prescribed in ${meds.length} distinct medications (${meds.map((m) => m.name).join(' and ')}). This typically occurs when a specialist prescribes a combination product without the previous provider's prescription being formally discontinued.`,
        records: meds.map((m) => ({
          id: m.id,
          label: m.name,
          value: `${m.strength || 'strength unrecorded'} (${m.dosage || 'dosage unrecorded'})`,
          source: m.provenance.kind === 'document' ? `Document: ${m.provenance.documentId}` : 'Patient-reported',
          date: m.prescribedOn,
        })),
        suggestedResolution: `Review with your doctor whether older prescriptions (${meds[0].name}) should be marked as stopped in favour of the latest regimen.`,
        status: 'unresolved',
      });
    }
  }

  // 2. Outdated / Stale Medication (>180 days since last prescription)
  for (const med of activeMeds) {
    if (med.prescribedOn) {
      const age = daysBetween(med.prescribedOn, today);
      if (!isNaN(age) && age > 180) {
        findings.push({
          id: `recon_stale_${med.id}`,
          type: 'outdated-medication',
          severity: 'medium',
          title: `Stale Prescription: ${med.name}`,
          explanation: `"${med.name}" was prescribed on ${med.prescribedOn} (${age} days ago). There are no subsequent renewal records or refills documented in more recent visit notes.`,
          records: [
            {
              id: med.id,
              label: med.name,
              value: `Prescribed on ${med.prescribedOn} by ${med.prescriber || 'unlisted provider'}`,
              source: med.provenance.kind === 'document' ? `Document: ${med.provenance.documentId}` : 'Patient-reported',
              date: med.prescribedOn,
            },
          ],
          suggestedResolution: 'Confirm whether you are actively taking this medication or if it was intended as a temporary/completed course.',
          status: 'unresolved',
        });
      }
    }
  }

  // 3. Lab progression & trend intelligence (chronological comparison)
  const labsByName = new Map<string, typeof record.labs>();
  for (const lab of record.labs || []) {
    const key = normalize(lab.test);
    const list = labsByName.get(key) || [];
    list.push(lab);
    labsByName.set(key, list);
  }

  for (const [testName, tests] of labsByName.entries()) {
    if (tests.length > 1) {
      const sorted = [...tests].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];

      if (first.id !== latest.id) {
        const delta = Number((latest.value - first.value).toFixed(2));
        const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
        findings.push({
          id: `recon_lab_${normalize(testName)}`,
          type: 'lab-discordance',
          severity: 'low',
          title: `Lab Trend: ${first.test} Progression`,
          explanation: `Documented progression between ${first.date} and ${latest.date}: ${first.test} changed from ${first.value} ${first.unit} to ${latest.value} ${latest.unit} (${deltaStr} ${latest.unit}).`,
          records: [
            {
              id: first.id,
              label: `${first.date} Baseline`,
              value: `${first.value} ${first.unit} (Ref: ${first.refRange || 'N/A'})`,
              source: first.provenance.kind === 'document' ? `Document: ${first.provenance.documentId}` : 'Patient-reported',
              date: first.date,
            },
            {
              id: latest.id,
              label: `${latest.date} Follow-up`,
              value: `${latest.value} ${latest.unit} (Ref: ${latest.refRange || 'N/A'})`,
              source: latest.provenance.kind === 'document' ? `Document: ${latest.provenance.documentId}` : 'Patient-reported',
              date: latest.date,
            },
          ],
          suggestedResolution: `Share this documented response trend with your consulting physician to assess therapy efficacy.`,
          status: 'unresolved',
        });
      }
    }
  }

  // 4. Incomplete / Patient-Reported Items needing document backing
  for (const med of activeMeds) {
    if (med.provenance.kind === 'patient-reported') {
      findings.push({
        id: `recon_unconfirmed_${med.id}`,
        type: 'conflicting-strength',
        severity: 'medium',
        title: `Unverified Provenance: ${med.name}`,
        explanation: `"${med.name}" is listed from patient recall without an uploaded prescription or discharge summary. Dosage instructions and prescriber are unverified.`,
        records: [
          {
            id: med.id,
            label: med.name,
            value: `Reported Dosage: ${med.dosage || 'None specified'} · Strength: ${med.strength || 'None specified'}`,
            source: 'Patient-reported (no document citation)',
            date: null,
          },
        ],
        suggestedResolution: 'Upload the original prescription document or request verification from the prescriber during your next appointment.',
        status: 'unresolved',
      });
    }
  }

  return findings;
}
