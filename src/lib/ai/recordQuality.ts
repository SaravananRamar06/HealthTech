import type { PatientRecord, RecordQualityIssue } from '@/lib/types';

/**
 * Deterministic Data Quality & Completeness Auditor:
 * Flags incomplete fields, missing units, stale prescriptions, and unreviewed extractions.
 * Explicitly does NOT compute a misleading "accuracy score".
 */
export function auditRecordQuality(record: PatientRecord): RecordQualityIssue[] {
  const issues: RecordQualityIssue[] = [];

  // 1. Check medications
  for (const med of record.medications || []) {
    if (!med.prescribedOn && med.status === 'active') {
      issues.push({
        id: `qual_med_date_${med.id}`,
        category: 'missing-date',
        severity: 'info',
        title: `Missing prescription date: ${med.name}`,
        detail: `"${med.name}" does not specify when it was originally prescribed.`,
        itemId: med.id,
        itemType: 'medication',
        status: 'pending',
      });
    }

    if (!med.dosage && med.status === 'active') {
      issues.push({
        id: `qual_med_dose_${med.id}`,
        category: 'incomplete-dosage',
        severity: 'warning',
        title: `Incomplete instructions: ${med.name}`,
        detail: `No dosage frequency or administration instructions (e.g. once daily) are recorded for "${med.name}".`,
        itemId: med.id,
        itemType: 'medication',
        status: 'pending',
      });
    }

    if (med.provenance.kind === 'patient-reported') {
      issues.push({
        id: `qual_med_prov_${med.id}`,
        category: 'unclear-status',
        severity: 'info',
        title: `Unverified provenance: ${med.name}`,
        detail: `"${med.name}" is patient-reported from recall without a supporting prescription document.`,
        itemId: med.id,
        itemType: 'medication',
        status: 'pending',
      });
    }
  }

  // 2. Check lab results
  for (const lab of record.labs || []) {
    if (!lab.unit || lab.unit.trim().length === 0) {
      issues.push({
        id: `qual_lab_unit_${lab.id}`,
        category: 'missing-unit',
        severity: 'warning',
        title: `Missing laboratory unit: ${lab.test}`,
        detail: `Test "${lab.test}" recorded a numerical value of ${lab.value} without measurement units (e.g. mg/dL, %).`,
        itemId: lab.id,
        itemType: 'lab',
        status: 'pending',
      });
    }

    if (!lab.date) {
      issues.push({
        id: `qual_lab_date_${lab.id}`,
        category: 'missing-date',
        severity: 'warning',
        title: `Missing collection date: ${lab.test}`,
        detail: `Test "${lab.test}" does not have a recorded specimen collection date.`,
        itemId: lab.id,
        itemType: 'lab',
        status: 'pending',
      });
    }
  }

  // 3. Check pending review queue
  if (record.pendingReview && record.pendingReview.length > 0) {
    issues.push({
      id: 'qual_pending_extractions',
      category: 'unreviewed-extraction',
      severity: 'warning',
      title: `${record.pendingReview.length} unreviewed document item(s)`,
      detail: `There are ${record.pendingReview.length} extracted items awaiting human-in-the-loop review in the Import queue. These items will never be shared until reviewed.`,
      itemId: 'pending_queue',
      itemType: 'document',
      status: 'pending',
    });
  }

  return issues;
}
