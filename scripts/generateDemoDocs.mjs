import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('public/demo');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function makeSimplePdf(title, lines) {
  // Construct a compliant, readable PDF 1.4
  let textStream = 'BT\n/F1 16 Tf\n50 740 Td\n(' + escapePdf(title) + ') Tj\nET\n';
  textStream += 'BT\n/F2 10 Tf\n50 720 Td\n(SYNTHETIC DATA - FOR HACKATHON DEMONSTRATION ONLY - NOT A REAL RECORD) Tj\nET\n';
  textStream += 'BT\n/F1 11 Tf\n50 690 Td\n16 TL\n';

  for (const line of lines) {
    textStream += '(' + escapePdf(line) + ') \'\n';
  }
  textStream += 'ET\n';

  const streamLen = Buffer.byteLength(textStream, 'utf8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += str + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj'
  );
  addObj(`4 0 obj\n<< /Length ${streamLen} >>\nstream\n${textStream}endstream\nendobj`);
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');
  addObj('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj');

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 7\n0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

function escapePdf(str) {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// 1. doc_01_discharge.pdf
const doc1Pdf = makeSimplePdf('GENERAL HOSPITAL - DISCHARGE SUMMARY', [
  'Patient: Meena Krishnan | Age/Sex: 58 / Female | IP No: GH-2025-8831',
  'Date of Admission: 10-Jan-2025 | Date of Discharge: 15-Jan-2025',
  'Consultant / Team: General Surgery Unit II / Discharge Team',
  '--------------------------------------------------------------------------',
  'DIAGNOSIS: Symptomatic Cholelithiasis (Gallstones)',
  'PROCEDURE: Underwent laparoscopic cholecystectomy under GA on 11-Jan-2025.',
  'COURSE IN HOSPITAL: Uneventful post-operative recovery.',
  '',
  'ALLERGIES / ADVERSE REACTIONS:',
  'Patient developed urticarial rash after course of amoxicillin-clavulanate for dental infection.',
  'Advised: Avoid penicillin derivatives.',
  '',
  'DISCHARGE MEDICATIONS:',
  '1. Amlodipine 5 mg tablet once daily (OD).',
  '2. Metformin 500 mg twice daily after meals (BD).',
  '3. Paracetamol 650 mg as needed for mild pain.',
  '',
  'FOLLOW UP: With surgeon in 2 weeks. Advised follow-up with GP for hypertension & diabetes.'
]);
fs.writeFileSync(path.join(outDir, 'doc_01_discharge.pdf'), doc1Pdf);

// 3. doc_03_labs.pdf
const doc3Pdf = makeSimplePdf('GENERAL HOSPITAL - CLINICAL BIOCHEMISTRY REPORT', [
  'Patient: Meena Krishnan | Age/Sex: 58 / Female | Ref By: Dr. A. Iyer',
  'Sample Collected: 05-Apr-2026 08:30 AM | Reported: 05-Apr-2026 02:00 PM',
  'Lab Ref No: LAB-2026-4421',
  '--------------------------------------------------------------------------',
  'TEST NAME                     RESULT       UNITS      REFERENCE INTERVAL',
  '--------------------------------------------------------------------------',
  'HbA1c                         8.4          %          4.0 - 5.6 (Good control <7.0)',
  'Fasting Blood Sugar (FBS)     142          mg/dL      70 - 99',
  'TSH                           6.8          uIU/mL     0.4 - 4.0',
  'Serum Creatinine              1.0          mg/dL      0.6 - 1.2',
  '--------------------------------------------------------------------------',
  'Interpretation: Glycemic control inadequate. TSH elevated indicating mild hypothyroidism.'
]);
fs.writeFileSync(path.join(outDir, 'doc_03_labs.pdf'), doc3Pdf);

// For simulated prescription image files (doc_02, doc_04, doc_05)
// We will generate an SVG and render it to a JPEG or direct valid visual image.
function makeSvgCard(title, subtitle, lines, stamp) {
  const lineElements = lines
    .map((l, i) => `<text x="40" y="${170 + i * 28}" font-family="monospace, sans-serif" font-size="14" fill="#333">${escapeXml(l)}</text>`)
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900" viewBox="0 0 700 900" style="background:#fff; font-family:sans-serif;">
    <rect width="700" height="900" fill="#fafafa"/>
    <rect x="20" y="20" width="660" height="860" rx="8" fill="#fff" stroke="#e0e0e0" stroke-width="2"/>
    <rect x="20" y="20" width="660" height="80" rx="8" fill="#f0f4f8"/>
    <text x="40" y="60" font-size="20" font-weight="bold" fill="#1e293b">${escapeXml(title)}</text>
    <text x="40" y="85" font-size="12" fill="#64748b">${escapeXml(subtitle)}</text>
    <rect x="40" y="115" width="620" height="26" fill="#fef3c7" rx="4"/>
    <text x="50" y="132" font-size="11" font-weight="bold" fill="#92400e">SYNTHETIC - DEMONSTRATION ONLY - NOT A REAL RECORD</text>
    ${lineElements}
    <rect x="420" y="780" width="220" height="70" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="4 4"/>
    <text x="440" y="810" font-size="11" font-style="italic" fill="#64748b">Verified &amp; Signed</text>
    <text x="440" y="830" font-size="14" font-weight="bold" fill="#334155">${escapeXml(stamp)}</text>
  </svg>`;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const doc2Svg = makeSvgCard(
  'PRIMARY CARE CLINIC',
  'Dr. A. Iyer, MBBS, MD (General Medicine) | Reg No: TN-49201',
  [
    'Date: 10-Mar-2026',
    'Patient: Meena Krishnan, 58 yrs / Female',
    'Diagnosis: Essential Hypertension, T2DM, Hypothyroidism',
    '-------------------------------------------------------------------',
    'Rx:',
    '1. Tab. Metfora 500 (Metformin 500 mg) -- 1 tab BD after meals',
    '2. Tab. Telmisartan 40 mg -- 1 tab OD morning',
    '3. Tab. Levothyroxine 50 mcg -- 1 tab OD empty stomach early morning',
    '-------------------------------------------------------------------',
    'Advice: Walk 30 min daily. Low salt, diabetic diet.',
    'Review in 3 months with fasting blood sugar and HbA1c.'
  ],
  'Dr. A. Iyer'
);
fs.writeFileSync(path.join(outDir, 'doc_02_gp_rx.jpg'), Buffer.from(doc2Svg));
fs.writeFileSync(path.join(outDir, 'doc_02_gp_rx.svg'), Buffer.from(doc2Svg));

const doc4Svg = makeSvgCard(
  'DIABETOLOGY SPECIALTY CENTER',
  'Dr. R. Menon, MD, DM (Endocrinology) | Reg No: TN-31082',
  [
    'Date: 20-Jul-2026',
    'Patient: Meena Krishnan, 58 F',
    'Clinical Note: HbA1c remains 8.4%. Inadequate glycemic response on monotherapy.',
    'Starting combination therapy with glimepiride.',
    '-------------------------------------------------------------------',
    'Rx:',
    '1. Tab. Glimfora-M1 (glimepiride 1 mg + metformin 500 mg)',
    '   Dose: 1 tab OD before breakfast',
    '-------------------------------------------------------------------',
    'Advice: Monitor FBS and PPBS weekly. Watch for hypoglycemia symptoms.',
    'Repeat HbA1c and lipid profile in 8-12 weeks.'
  ],
  'Dr. R. Menon'
);
fs.writeFileSync(path.join(outDir, 'doc_04_dia_rx.jpg'), Buffer.from(doc4Svg));
fs.writeFileSync(path.join(outDir, 'doc_04_dia_rx.svg'), Buffer.from(doc4Svg));

const doc5Svg = makeSvgCard(
  'GENERAL HOSPITAL CLINICAL LABORATORY',
  'Automated Biochemistry Section | NABL Accredited',
  [
    'Date: 12-Sep-2026',
    'Patient: Meena Krishnan (58 / F) | Ref: Dr. R. Menon',
    'Sample: Fasting Blood Serum | Collected: 08:00 AM',
    '-------------------------------------------------------------------',
    'TEST                       RESULT      UNIT        REF RANGE',
    'HbA1c:                     7.6         %           4.0 - 5.6',
    'FBS (Fasting Glucose):     118         mg/dL       70 - 99',
    'TSH:                       3.1         uIU/mL      0.4 - 4.0',
    'LDL Cholesterol:           112         mg/dL       < 100',
    '-------------------------------------------------------------------',
    'Comment: HbA1c improved from 8.4% to 7.6%. TSH normalized on 50mcg thyroxine.'
  ],
  'Dr. K. Swaminathan (Pathologist)'
);
fs.writeFileSync(path.join(outDir, 'doc_05_labs.jpg'), Buffer.from(doc5Svg));
fs.writeFileSync(path.join(outDir, 'doc_05_labs.svg'), Buffer.from(doc5Svg));

console.log('Successfully generated all 5 synthetic demo documents in public/demo!');
