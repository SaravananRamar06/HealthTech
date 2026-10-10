import type { Flag, ISODate, PatientRecord } from './types';

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
 * Pure function: Analyze a patient record for clinical safety & reconciliation flags.
 * Worded as "for review", never as diagnosis or medical advice.
 */
export function analyzeRecord(record: PatientRecord, today: ISODate): Flag[] {
  const flags: Flag[] = [];

  // 1. Allergy status unknown
  if (record.allergyStatus === 'unknown') {
    flags.push({
      type: 'allergy-status-unknown',
      severity: 'review',
      title: 'Allergy status not recorded',
      detail: 'No allergy status is documented in this record. Review allergy history with the patient.',
      itemIds: [],
    });
  }

  // Active medications
  const activeMeds = (record.medications || []).filter((m) => m.status === 'active');

  // 2. Duplicate ingredient across different products
  // Refills of the same product count as one medicine
  const ingredientMap = new Map<string, typeof activeMeds>();
  for (const med of activeMeds) {
    if (!med.ingredients || !med.ingredients.length) continue;
    for (const rawIng of med.ingredients) {
      const ing = normalize(rawIng);
      if (!ing) continue;
      const list = ingredientMap.get(ing) || [];
      list.push(med);
      ingredientMap.set(ing, list);
    }
  }

  for (const [ingredient, meds] of ingredientMap.entries()) {
    // Check if they are distinct products (not just refills of the same product)
    const distinctNames = new Set(meds.map((m) => normalize(m.name)));
    if (distinctNames.size > 1) {
      const namesList = Array.from(new Set(meds.map((m) => m.name))).join(', ');
      flags.push({
        type: 'duplicate-ingredient',
        severity: 'review',
        title: `Duplicate ingredient: ${ingredient}`,
        detail: `The ingredient "${ingredient}" appears in multiple active medications (${namesList}). For clinician review to prevent accidental duplicate therapy.`,
        itemIds: meds.map((m) => m.id),
      });
    }
  }

  // 3. Allergy-medication match (exact or substring match)
  const allergies = record.allergies || [];
  for (const allergy of allergies) {
    const allergySub = normalize(allergy.substance);
    if (!allergySub) continue;

    for (const med of activeMeds) {
      const medName = normalize(med.name);
      const ingredients = (med.ingredients || []).map(normalize);

      const matchesIngredient = ingredients.some(
        (ing) => ing === allergySub || ing.includes(allergySub) || allergySub.includes(ing)
      );
      const matchesName = medName === allergySub || medName.includes(allergySub);

      if (matchesIngredient || matchesName) {
        flags.push({
          type: 'allergy-med-match',
          severity: 'review',
          title: `Allergy alert: ${allergy.substance}`,
          detail: `Active medication "${med.name}" may contain or match recorded allergen "${allergy.substance}". For immediate clinical review.`,
          itemIds: [allergy.id, med.id],
        });
      }
    }
  }

  // 4. Possibly outdated medication (> 180 days since last prescribed)
  for (const med of activeMeds) {
    if (med.prescribedOn) {
      const ageInDays = daysBetween(med.prescribedOn, today);
      if (!isNaN(ageInDays) && ageInDays > 180) {
        flags.push({
          type: 'possibly-outdated',
          severity: 'review',
          title: `Possibly outdated: ${med.name}`,
          detail: `"${med.name}" was last prescribed on ${med.prescribedOn} (${ageInDays} days ago). Confirm whether patient is still taking this medication.`,
          itemIds: [med.id],
        });
      }
    }
  }

  // 5. Items awaiting review in pendingReview
  if (record.pendingReview && record.pendingReview.length > 0) {
    flags.push({
      type: 'pending-review',
      severity: 'info',
      title: 'Items awaiting patient review',
      detail: `${record.pendingReview.length} AI-extracted item(s) are awaiting review. Unreviewed items are never shared with clinicians.`,
      itemIds: record.pendingReview.map((item) => item.tempId),
    });
  }

  // 6. Recent lab results on file (<= 90 days relative to today)
  const recentLabs = (record.labs || []).filter((lab) => {
    if (!lab.date) return false;
    const age = daysBetween(lab.date, today);
    return !isNaN(age) && age >= 0 && age <= 90;
  });

  for (const lab of recentLabs) {
    flags.push({
      type: 'recent-result',
      severity: 'info',
      title: `Recent test on file: ${lab.test}`,
      detail: `${lab.test} result (${lab.value} ${lab.unit}) from ${lab.date}. May prevent unnecessary repeat lab orders.`,
      itemIds: [lab.id],
    });
  }

  // 7. Patient-reported items without supporting document
  const patientReportedIds: string[] = [];
  const checkProvenance = (item: { id: string; provenance: { kind: string } }) => {
    if (item.provenance?.kind === 'patient-reported') {
      patientReportedIds.push(item.id);
    }
  };

  (record.medications || []).forEach(checkProvenance);
  (record.allergies || []).forEach(checkProvenance);
  (record.conditions || []).forEach(checkProvenance);
  (record.labs || []).forEach(checkProvenance);
  (record.events || []).forEach(checkProvenance);

  if (patientReportedIds.length > 0) {
    flags.push({
      type: 'patient-reported-only',
      severity: 'info',
      title: `${patientReportedIds.length} patient-reported item(s)`,
      detail: `${patientReportedIds.length} item(s) are patient-reported from memory without supporting documents. Consider clinical verification during consult.`,
      itemIds: patientReportedIds,
    });
  }

  return flags;
}
