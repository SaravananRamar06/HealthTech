# Handover: HealthTech Hackathon Plan ("Lost in Transit")

## Context: read this first
- **It is now Sat 10 Oct 2026, about 15:15 IST.** The event ends at **20:30** and the submission deadline is **21:00** (you confirmed IST). That leaves **about 5h15m, not 24h.**
- **AI provider: Google Gemini** (you confirmed). Every Gemini-specific detail is in section F under "Extraction details", and the data-use terms that come with the free tier are in section G.
- The repo `SaravananRamar06/HealthTech` has been initialised but has **no commits**. Node 24, npm 11, git and gh are installed. The Vercel CLI isn't installed, so deploy through the Vercel dashboard's GitHub import.
- This plan is sized for ~2h45m of building, 45 min of integration, 45 min of video work and 45 min for submission plus buffer. If you have more time than that, keep the same order and add items from "Optional" only after the golden path works in production.
- Judging weights and deliverables come from your brief (Tech 35, Innovation 20, Feasibility 20, Demo 15, Deployment 10; repo, 2–5 min video, README, public URL, open-source and API disclosure). **They aren't in the official statement you pasted, so check them against the official rules page.**

---

## A. Problem understanding

**What the official statement says (paraphrased):**
- **Who:** patients with long-term conditions (diabetes, hypertension, thyroid disorders, asthma) who see many doctors, labs and pharmacies over the years.
- **What:** each provider keeps its own records: paper prescriptions, PDF reports, photos sent over messaging apps. The patient carries the history, and it rarely follows them when they change doctors, move cities or arrive at an ER.
- **Five named sub-problems:**
  1. Scattered records with no single timeline.
  2. Unreliable recall of diagnoses, allergies, medicines and doses.
  3. Repeated tests, and overlapping or interacting prescriptions.
  4. Insecure, difficult sharing: no simple, secure way to share the right history with the right doctor, **or to stop sharing it afterwards**.
  5. Broken continuity of care.
- **Impact named:** repeated tests cost money and time; treatment is delayed or wrong; medication errors are avoidable but happen, especially in emergencies; continuity is lost; the health system is strained; patients have no real ownership of their data.
- **Data:** simulated or public data is allowed. Integration with real hospital systems is not required.

**Our interpretation:**
- The gap is not storage. It is **usability at the moment of care**. In a short consult, a clinician needs a current, compact view they can trust: allergies, current medicines and doses, active conditions, recent results and key events. They also need to know **which facts are backed by a document and which come from the patient's memory**.
- The patient (or a caregiver) is the only party present at every encounter. When providers aren't connected, the patient is the practical place to integrate the history.
- Sharing "the right history with the right doctor" means sharing only what is needed, for a limited time, with the option to revoke and visibility of who opened it.

**Root causes:**
- Every provider keeps its own records.
- Formats are unstructured (paper, photos, PDFs).
- Interoperability doesn't reach the long tail of small clinics and labs (*assumption*).
- The same molecule is sold under many brand names, which hides duplicates.
- Consults are short.
- Sharing over chat apps has no scope, no expiry and no way to revoke.

**Situations where it bites:** a referral to a new specialist, moving cities, an ER visit, a second opinion, a caregiver managing a parent's care.

**Improvements we will *demonstrate* (these are not claims about clinical outcomes):**
1. A folder of 5 mixed documents becomes a structured record linked to its sources in about 2 minutes. Time this in the demo.
2. Facts the patient forgot are found in the documents, for example an allergy buried in a discharge summary.
3. The same ingredient prescribed by two different doctors is flagged before the visit. Recent results are shown with their dates, so tests aren't repeated without reason.
4. The clinician can read a brief covering only what was shared within about 30 seconds, with the source shown on every fact.
5. The patient shares only selected items. The link expires automatically, can be revoked, and the patient can see when it was opened.

**Assumptions to validate later:**
- Indian context: WhatsApp forwarding, many brands per molecule, many clinics and labs not connected to ABDM.
- Caregivers will spend about 2 minutes reviewing extracted facts.
- Clinicians will open a link or QR code during a consult.

---

## B. Solution exploration

| # | Direction | Sub-problems | Differentiation | Feasible in ~3 h? | Demo value | Main risk |
|---|---|---|---|---|---|---|
| 1 | Patient types a summary + share link (your CareBridge baseline) | 4, 5 | Low. PHR apps already do this, and typing from memory relies on the recall the statement calls unreliable | High | Weak | Looks like a generic PHR |
| 2 | Documents → reviewed record linked to sources (AI extraction + human review) | 1, 2 | Medium. Digitising reports exists; **showing the source of every fact and requiring patient review** is our twist | Medium (depends on AI) | Strong | Misreads. Mitigation: mandatory review, verbatim excerpts, cached fallback |
| 3 | Scoped, expiring, revocable share that the server cannot read (in the style of SMART Health Links) | 4, 5 | Medium. The pattern exists (SMART Health Links; ABDM consent for connected facilities) but is rare for the paper and WhatsApp long tail | High | Strong (live revoke) | Overclaiming security |
| 4 | Flags across prescribers: duplicate ingredient, possibly outdated medicine, recent tests, unknown allergy status | 2, 3 | Medium-high when fed with data extracted from different prescribers | High (pure functions) | Strong | False positives; must never read as medical advice |
| 5 | Emergency QR card | 5 (ER) | Low. Phone "medical ID" features already exist | High | Medium | Anyone holding the card can read it |
| 6 | AI narrative summary or chatbot | 5 | Low, and you asked for no chatbot | Medium | Medium | Hallucination; drifts into clinical advice |

**Existing products and standards (checked today):**
- **ABDM / ABHA** (verified): the ABHA app lets patients share records with doctors and facilities by consent and revoke that consent. A consent manager governs access, and records are fetched on demand from connected facilities ([NHA ABHA app deck](https://abdm.gov.in:8081/uploads/ABHA_App_8413f7c295.pdf)).
  → **Do not claim consented or revocable sharing as novel.** Position Handover as *complementary*: it covers documents that never entered a connected system.
- **SMART Health Links** (verified) is an HL7 standard for encrypted sharing by link ([HL7 IG](https://hl7.org/fhir/uv/smart-health-cards-and-links/links-specification.html)):
  - a 32-byte key in the URL `#fragment`;
  - an optional passcode, with attempt limits enforced by the server;
  - an `exp` field that is only a hint;
  - revocation enforced by the server.
  → We borrow this pattern in simplified form. **It is not spec-conformant, and the README must say so.**
- Personal-health-record apps that store and digitise reports exist (not re-verified today), so "upload and digitise" alone is not novel.
- **Name:** "CareBridge" is an existing US healthcare company; Elevance Health's Carelon agreed to acquire it in Oct 2024 ([Fierce Healthcare](https://www.fiercehealthcare.com/finance/elevance-health-scoop-value-based-care-company-carebridge)). I recommend **Handover**, the clinical term for passing care information from one clinician to the next. It is not trademark-checked.

---

## C. Recommendation: **Handover**

It is one linear workflow, not a bundle of features: **documents in → reviewed, reconciled record → scoped, revocable brief out.** It combines directions 2, 4 and 3; directions 5 and 6 are excluded.

**Value proposition:** *"Turn the folder of prescriptions, reports and WhatsApp photos into a one-screen brief your next doctor can trust. Every fact traces back to its source, and only the people you choose see it, for as long as you choose."*

**How it differs from a generic health-record app:**
1. **Every fact shows its source.** Each fact carries the source document, a verbatim excerpt and one of three labels:
   - *Patient-reported*
   - *From document · confirmed by patient*
   - *From document · corrected by patient*

   AI output waits in a review queue and is **never shared before the patient has reviewed it.**
2. **Flags across prescribers.** Rules are fixed, explainable and reproducible (for example, metformin prescribed by two doctors under two brand names). They are worded as "for review", never as advice.
3. **Privacy built into the design.**
   - The record stays in the patient's browser.
   - A share is encrypted in the browser with AES-256-GCM, and the key exists only in the link's `#fragment`.
   - The server stores only ciphertext. It enforces expiry (deleting the data when it expires), handles revocation and logs every opening.
   - The brief tells the clinician "N items withheld by patient", so they know the picture is partial.
4. **Feasible without provider integration.** Clinicians need only a browser. The running cost per extracted document is low (check current Gemini pricing; the free tier costs nothing but comes with the data-use terms in section G). In future it could export to FHIR or ABDM formats instead of competing with ABDM.

**Honest pitch line:** *"We combine known patterns (document digitisation, SMART-Health-Links-style links) into a workflow built around sources, aimed at the paper and WhatsApp long tail."*

---

## D. MVP scope

**Must-have (the golden path):**
1. **Vault stored in the browser** ("local-first"; the record lives in the patient's browser, not on our server).
   - "Load demo patient (synthetic)" button.
   - Dashboard sections: allergies with an explicit status (unknown / no known allergies / has allergies), conditions, current medicines, lab results with HbA1c and TSH trends, and a timeline.
   - A source label ("provenance badge") on every item.
   - Minimal editing: mark a medicine stopped, set the allergy status, delete an item, add a patient-reported item.
2. **Document import.**
   - Upload an image or PDF, or use "Use sample documents".
   - Gemini extracts the facts live.
   - A review queue shows each fact with its excerpt and confidence; the patient can accept it, edit its key fields, or reject it.
   - Accepted facts are merged into the record together with their source.
   - Cached results for the 5 bundled demo documents act as a labelled fallback.
3. **Quality flags.** Pure TypeScript functions with unit tests:
   - Duplicate ingredient across different products. Refills of the *same* product count as one medicine.
   - An allergy substance matches the ingredient of an active medicine (exact match only).
   - Medicine possibly outdated: more than 180 days since it was last prescribed.
   - Allergy status unknown.
   - Items still waiting for review.
   - Recent result on file (90 days or less).
   - Count of patient-reported items with no supporting document.
4. **Share.**
   - Choose sections and exclude individual items; enter a recipient label; choose an expiry of 1 h, 24 h (default) or 7 d.
   - The browser encrypts the payload and produces a link and a QR code.
   - The clinician opens the brief at `/s/[id]#k=…`.
   - The patient sees an access log and can revoke.
   - The viewer handles four error states: revoked, expired, missing key, corrupted link.
5. **Delivery.** Deployed on Vercel, with README and video. Synthetic data and disclaimers are clearly labelled. A banner on the public site says "do not upload real medical records".

**Optional.** Only after the golden path passes in production, in this order:
1. QR code polish and a printable card.
2. Share PIN: checked by the server, 5 attempts allowed.
3. Emergency share preset: allergies, medicines, conditions and emergency contact.
4. Encrypted source images inside shares ("view original").
5. "What changed since the last share".
6. FHIR R4 bundle export, inspired by the International Patient Summary.
7. Duplicates within the same drug class, using a small hand-built list.

**Out of scope.** List these in the README:
- Accounts or login; sync or backup across devices.
- Integration with ABDM/ABHA, EHRs or a FHIR server.
- Real patient data.
- Drug–drug interaction checking (it needs a validated knowledge base).
- Diagnosis, treatment or dose advice.
- A chatbot.
- Clinician accounts or e-prescriptions.
- SMS or WhatsApp integration.
- Native mobile apps, blockchain, model training.
- **Any compliance claim** (HIPAA, the DPDP Act 2023, ABDM).

---

## E. Demo story and user journey (all data synthetic)

**Persona (fictional):** **Meena Krishnan**, 58, Chennai. She has type 2 diabetes, hypertension and hypothyroidism. She is moving to Bengaluru and sees **Dr. S. Rao (Endocrinology)** for the first time tomorrow. Her daughter **Priya** manages her papers.

**Synthetic documents** (made by P4):
- Stamp every document "SYNTHETIC — DEMONSTRATION ONLY".
- Use fictional clinics.
- Print the generic name next to a clearly fictional brand name, and search each brand name once to make sure it isn't a real product.

| Document | Format | What is planted in it |
|---|---|---|
| Discharge summary, Jan 2025 | PDF | Laparoscopic cholecystectomy; **urticarial rash after amoxicillin-clavulanate** (the forgotten allergy); discharge medicines amlodipine 5 mg once daily and metformin 500 mg twice daily |
| GP prescription, Dr. A. Iyer, Mar 2026 | phone photo | metformin 500 mg twice daily ("Metfora 500"), telmisartan 40 mg once daily, levothyroxine 50 mcg once daily |
| Lab report, Apr 2026 | PDF | HbA1c 8.4 %, fasting blood sugar, TSH 6.8, creatinine |
| Diabetologist prescription, Dr. R. Menon, Jul 2026 | phone photo | **glimepiride 1 mg + metformin 500 mg** combination ("Glimfora-M1") twice daily; no mention of the GP's metformin |
| Lab report, Sep 2026 | photo | HbA1c 7.6 %, fasting blood sugar, TSH 3.1, LDL |

The starting record also holds one patient-reported item: escitalopram 10 mg. Meena remembers it, but the prescription is lost.

**Video beats (aim for about 3:45):**
1. **0:00 The problem (25 s).** The folder, the WhatsApp photos, a 10-minute consult tomorrow.
2. **0:25 Import (50 s).**
   - Drop in the 5 documents.
   - The review queue shows each fact with its excerpt and confidence.
   - Priya confirms most facts, corrects one dose and rejects one misread.
   - The record fills in, and the labels show where each fact came from.
3. **1:15 The "aha" (40 s).**
   - Flag: *metformin in 2 active medicines from 2 doctors*.
   - Flag: *amoxicillin-clavulanate allergy found in the 2025 discharge summary* (the allergy status had been "not recorded").
   - Flag: *amlodipine last prescribed Jan 2025: still taking it?* Priya marks it stopped.
   - The Sep 2026 HbA1c result is on file, and the trend shows 8.4 → 7.6.
4. **1:55 Share (40 s).**
   - Recipient: Dr. S. Rao.
   - Escitalopram is excluded; the app warns that hiding medicines can affect safety.
   - Expiry 24 h; a link and QR code appear.
   - One sentence on encryption and the `#fragment`.
5. **2:35 Clinician view (40 s).** On a phone or in an incognito window:
   - Allergies at the top.
   - The flags marked "for review".
   - Medicines with their sources, the lab trend and the timeline.
   - The banner "1 item withheld by patient", a legend for the source labels and the disclaimer.
6. **3:15 Control (20 s).**
   - The patient sees "Opened 2 min ago · Chrome on Android" and revokes the link.
   - The doctor refreshes and sees "Access revoked by the patient".
7. **3:35 Under the hood, honestly (20 s).** One architecture frame, then: synthetic data, not a medical device, and what is *not* protected.

---

## F. Architecture and data model

**Stack** (one repo, one deployment):

| Part | Choice |
|---|---|
| App framework | Next.js (App Router, TypeScript) with Tailwind, hosted on Vercel |
| Vault storage in the browser | zustand with `persist` to localStorage; `idb-keyval` (IndexedDB) for uploaded files |
| Share encryption | Web Crypto (AES-GCM) |
| Share records | Upstash Redis via `@upstash/redis` |
| Extraction | Gemini API via `@google/genai`, with `zod` to validate the output |
| QR codes | `qrcode.react` |
| Tests | Vitest |

```
Patient/caregiver browser                    Vercel (Next.js)                   External
┌───────────────────────────┐ file (resized) ┌──────────────────────────┐  base64 ┌─────────────┐
│ Vault: localStorage + IDB │──────────────▶ │ POST /api/extract         │───────▶│ Gemini API  │
│ Review queue · flags (TS) │◀────────────── │ no storage · rate-limited │◀───────│ Flash model │
│ Share: build → AES-GCM    │ ciphertext+iv  ├──────────────────────────┤         └─────────────┘
│ key only in link #fragment│──────────────▶ │ /api/shares (+ /access)   │───────▶ Upstash Redis
└───────────────────────────┘                │ expiry · revoke · log     │         (ciphertext, TTL)
Clinician browser: /s/{id}#k=… → GET ciphertext → decrypt in the browser → <ClinicianBrief/>
```

**Why this design:**
- No authentication is needed, because the vault lives on the patient's device.
- There is one deployment and one language for four people working with AI assistants.
- Redis TTL (time-to-live) actually deletes share data when it expires.
- Everything works on serverless hosting.

**Trade-offs we accept and will state:**
- The vault lives on one device. There is no backup, and the data is lost if browser storage is cleared. Roadmap item: encrypted sync.
- In-browser encryption relies on the JavaScript we serve. A compromised deployment could steal keys.

**Who owns which folder:**

| Path | Owner |
|---|---|
| `src/app/page.tsx` (landing page), `src/app/vault/page.tsx` | P1 |
| `src/app/vault/import/page.tsx` | P2 |
| `src/app/vault/share/page.tsx`, `src/app/s/[id]/page.tsx` | P3 |
| `src/app/api/extract/route.ts`, `src/lib/extract/*` | P2 |
| `src/app/api/shares/**`, `src/lib/share/{crypto,payload,store}.ts` (+ tests) | P3 |
| `src/components/record/*`, `src/lib/types.ts`, `src/lib/vault.ts` | P1 |
| `src/components/ClinicianBrief.tsx`, `src/lib/analyze.ts` (+ tests) | P4 |
| `src/lib/demo/*.json`, `public/demo/*` | P4 |

**Shared contract: `src/lib/types.ts`.** P1 commits it by 15:50. After that, only P1 changes it, and every change is announced in team chat.

```ts
export type ISODate = string;                       // 'YYYY-MM-DD'
export type Confidence = 'high' | 'medium' | 'low';
export type Provenance =
  | { kind: 'patient-reported' }
  | { kind: 'document'; documentId: string; excerpt: string; confidence: Confidence; edited: boolean };

export interface Medication { id: string; name: string; ingredients: string[]; strength: string | null;
  dosage: string | null; prescriber: string | null; prescribedOn: ISODate | null;
  status: 'active' | 'stopped'; provenance: Provenance }
export interface Allergy   { id: string; substance: string; reaction: string | null; provenance: Provenance }
export interface Condition { id: string; name: string; since: ISODate | null; provenance: Provenance }
export interface LabResult { id: string; test: string; value: number; unit: string; refRange: string | null;
  date: ISODate; provenance: Provenance }
export interface CareEvent { id: string; type: 'visit' | 'admission' | 'procedure'; title: string;
  date: ISODate | null; facility: string | null; provenance: Provenance }
export interface SourceDocument { id: string; title: string;
  docType: 'prescription' | 'lab-report' | 'discharge-summary' | 'other';
  date: ISODate | null; facility: string | null; clinician: string | null;
  fileRef: string }                                 // '/demo/x.jpg' | 'idb:<key>'

export interface PatientRecord {
  version: 1; isDemo: boolean;
  profile: { name: string; dateOfBirth: ISODate; sex: 'female' | 'male' | 'other';
             emergencyContact: { name: string; phone: string } | null };
  allergyStatus: 'unknown' | 'none-known' | 'has-allergies';
  allergies: Allergy[]; conditions: Condition[]; medications: Medication[];
  labs: LabResult[]; events: CareEvent[]; documents: SourceDocument[];
  pendingReview: ExtractedItem[];                   // AI output not yet reviewed: NEVER shared
}

type Fields<T> = Omit<T, 'id' | 'provenance'>;
export type ExtractedItem = { tempId: string; documentId: string; excerpt: string; confidence: Confidence } & (
  | { type: 'medication'; data: Omit<Fields<Medication>, 'status'> }
  | { type: 'allergy';    data: Fields<Allergy> }
  | { type: 'condition';  data: Fields<Condition> }
  | { type: 'lab';        data: Omit<Fields<LabResult>, 'date'> & { date: ISODate | null } } // null → document date
  | { type: 'event';      data: Fields<CareEvent> });
export interface ExtractionResult { document: Omit<SourceDocument, 'id' | 'fileRef'>;
  items: ExtractedItem[]; mode: 'live' | 'cached-demo' }

export type FlagType = 'duplicate-ingredient' | 'allergy-med-match' | 'possibly-outdated'
  | 'allergy-status-unknown' | 'pending-review' | 'recent-result' | 'patient-reported-only';
export interface Flag { type: FlagType; severity: 'review' | 'info'; title: string; detail: string; itemIds: string[] }

export type ShareSection = 'allergies' | 'conditions' | 'medications' | 'labs' | 'events' | 'emergencyContact';
export interface ShareSelection { sections: ShareSection[]; excludedIds: string[]; recipientLabel: string; expiresAt: string }
export interface SharePayload {
  v: 1; isDemo: boolean; createdAt: string; expiresAt: string; recipientLabel: string;
  patient: { name: string; age: number; sex: string; emergencyContact: { name: string; phone: string } | null };
  allergyStatus: PatientRecord['allergyStatus'];
  allergies: Allergy[]; conditions: Condition[]; medications: Medication[]; labs: LabResult[]; events: CareEvent[];
  documents: Omit<SourceDocument, 'fileRef'>[];     // metadata only, for the source labels
  flags: Flag[];                                    // computed on the SHARED subset only, so withheld items never leak
  withheldCount: number;                            // number of items excluded (a count only)
}
// analyzeRecord(r: PatientRecord, today: ISODate): Flag[]                         P4 · src/lib/analyze.ts
// buildSharePayload(r: PatientRecord, s: ShareSelection, now: Date): SharePayload P3 · src/lib/share/payload.ts
// useVault(): { record, loadDemo('start'|'complete'), addDocument(doc, file?), queueForReview(items),
//   acceptItem(tempId, editedData?), rejectItem(tempId), updateItem(id, patch), removeItem(id),
//   setAllergyStatus(s), deleteAllData() }                                        P1 · src/lib/vault.ts
//   acceptItem on an allergy sets allergyStatus to 'has-allergies'.
//   Vault pages are client-only: wait until mounted before reading the store, or hydration fails.
```

**Interface wording.** Use these labels everywhere, in both the patient view and the clinician view:
- "Patient-reported"
- "From document · confirmed by patient"
- "From document · corrected by patient"
- "AI-extracted · awaiting review" (review queue only)

**Never use the word "verified".**

**API endpoints (P2 and P3):**

| Endpoint | Request | Response | Notes |
|---|---|---|---|
| `POST /api/extract` | multipart: `file` (jpeg/png/webp/pdf, ≤4 MB) and `documentId` | 200 `ExtractionResult`; 422 unreadable; 429 rate-limited; 502 AI unavailable | Node runtime; `maxDuration` 60; stores nothing; never logs request bodies |
| `POST /api/shares` | `{ciphertext, iv, expiresAt}` (≤300 KB, expiry ≤7 days) | 201 `{id, manageToken}` | `id` is 128 random bits; `manageToken` is 256 bits, stored only as a SHA-256 hash |
| `GET /api/shares/:id` | (none) | 200 `{ciphertext, iv, expiresAt}`; 410 `{reason:'revoked'}`; 404 `{reason:'expired-or-missing'}` | Adds an entry `{at, ua}` to the access log; `Cache-Control: no-store`; marked as dynamic |
| `DELETE /api/shares/:id` | header `Authorization: Bearer <manageToken>` | 204 | Deletes the ciphertext and leaves a marker so the viewer reports "revoked" |
| `GET /api/shares/:id/access` | header `Authorization: Bearer <manageToken>` | 200 `{events:[{at, ua}]}` | |

**Redis keys:**
- `share:{id}`: the share record. Its TTL equals the expiry.
- `share:{id}:log`: the access log. Its TTL is the expiry plus 7 days.
- `share:{id}:revoked`: the revocation marker. Its TTL is 7 days.

Hide Redis behind a `ShareStore` interface with two versions: Redis for production, and an in-memory store for local development and tests.

**Encryption:**
1. Generate an AES-GCM 256-bit key and a random 96-bit IV.
2. Encrypt the payload as UTF-8 JSON.
3. Export the raw key as base64url (43 characters).
4. Build the link `https://<app>/s/<id>#k=<key>`.

The browser never sends the fragment to the server. The `manageToken` and the list of shares are kept in the patient's localStorage.

**Extraction details (P2; Gemini API).** The names below come from Google's docs and announcements. Check them against the official API reference before coding.
- **SDK:** `@google/genai`. Create the client with `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })` and call `ai.models.generateContent({ model, contents, config })`. The key stays on the server and must never be a `NEXT_PUBLIC_` variable.
- **Model:** the newest **Flash-tier** Gemini model in your AI Studio account. It is fast, reads images and PDFs, and supports JSON-schema output. Copy the exact model ID from AI Studio rather than guessing it.
- **Input parts:**
  - A text part holding the instructions.
  - An `{ inlineData: { mimeType, data: <base64> } }` part for the image or PDF.
- **Structured output:**
  - Set `config: { responseMimeType: 'application/json', responseJsonSchema: <JSON Schema> }`.
  - Generate the JSON Schema from the Zod schema with `z.toJSONSchema()` (Zod 4) or `zod-to-json-schema` (Zod 3).
  - **Always** validate the reply with `ExtractionSchema.parse(JSON.parse(response.text))`. Drop items that fail validation or have no excerpt.
- **Test one PDF within the first 30 minutes.** A developer forum report describes inline PDFs misbehaving with this SDK. If that happens to you, convert the demo PDFs to page images and upload those instead.
- **Size and speed:**
  - The browser resizes images to at most 1600 px JPEG, because Vercel limits request bodies to about 4.5 MB.
  - Extract **at most 2 documents at a time**, to stay under the free tier's per-minute limits. Check your limits in AI Studio.
  - On HTTP 429 (rate limited), wait and retry once, then use the cached result.
  - Time out after 45 s on the client, then use the cached result (demo documents) or manual entry.
- Prompt rules:
  - Extract only what is written in the document.
  - Copy the supporting text verbatim into `excerpt`.
  - Use `null` for anything missing.
  - Never infer a diagnosis.
  - List ingredients only if they are printed.
  - Give low confidence for unclear handwriting.
- Keep the Zod schema flat: strings, numbers, enums and nullable fields.
- **Public endpoint protection:** rate-limit by IP with `@upstash/ratelimit` (e.g. 10 per hour). If billing is enabled, set a budget alert in Google Cloud.

---

## G. Privacy and risk

| Risk | Mitigation | What remains (state it honestly) |
|---|---|---|
| Health documents are sent to a third-party AI (Google Gemini). **On the free tier, Google may use inputs and outputs to improve its products, and human reviewers may read them. Its terms say not to submit sensitive or personal information.** | Synthetic documents only. The public site says "Do not upload real medical records". A consent checkbox names Google Gemini before any upload. The route stores nothing and logs no request bodies. If possible, enable billing on the Cloud project so the paid-service terms apply (check the live terms first). Disclose all of this in the README | On the free tier, Google staff may review uploads. A real product would need paid terms, a data processing agreement and a proper consent design |
| The AI misreads a drug or dose | Mandatory review; excerpt and confidence shown; low-confidence items highlighted; unreviewed items never shared; source labels in the brief | The patient can confirm a wrong fact, so the brief says "verify clinically" |
| A share link leaks (forwarded, screenshotted, saved in history) | 128-bit id and 256-bit key; 24 h default and 7 d maximum expiry; revoking deletes the ciphertext; access log; `noindex`; generic page title and no link preview containing the patient's name; `Referrer-Policy: no-referrer`; ciphertext fetched only by browser JavaScript, so link-preview bots don't trigger the access log | Anyone with the full link can view it until it expires or is revoked. Revoking cannot take back what was already seen |
| Our server is breached | It holds only ciphertext and minimal metadata (timestamps, coarse browser info, no IP); data deleted at expiry | The JavaScript we serve could be tampered with if the deployment is compromised |
| Someone gets access to the patient's device | A "Delete all my data" button revokes all shares and wipes localStorage and IndexedDB; a demo banner | The vault is not encrypted at rest in the browser |
| The manage token is lost (browser data cleared) | Shares still expire automatically, and the default expiry is short | The patient can't revoke early |
| Flags are wrong (false positives or misses) | Exact, explainable rules; refills of the same product are merged; "possible … review with your doctor" wording; unit tests | No interaction checking; detection depends on ingredients printed on the document |
| Withholding items hides information the doctor needs for safety | A warning when the patient excludes a medicine; the brief says "N items withheld" | The patient's choice prevails |
| The public API is abused (storage spam, burning AI credits) | Size limits, maximum TTL, rate limits, spending limit | — |
| Secrets leak | Keys are server-only (never `NEXT_PUBLIC_`); `.env*` is gitignored; an `.env.example` without values is committed | — |
| Clinical or legal exposure | Disclaimers; no advice; **no compliance claims** | Real use would need a DPDP Act 2023 assessment, a security review and clinical validation |

**Claims we may make, but only once they are implemented and tested:**
- "Your summary is encrypted in your browser with AES-256-GCM before upload."
- "Our server stores only ciphertext and never receives the key."
- "Links expire automatically and the stored data is deleted."
- "You can revoke a link at any time and see when it was opened."

**Claims we must never make:**
- HIPAA or DPDP compliant.
- "100% secure" or "military-grade".
- "Verified medical record" or "AI-verified".
- "Revoking erases what the doctor saw".
- "Detects drug interactions".

---

## H. Team split

| Person | Owns | Delivers (by time) | Needs | Provides |
|---|---|---|---|---|
| **P1 Lead / Vault** (strongest React developer) | App shell, `types.ts`, vault store, dashboard, shared record components, merges and deploys | **15:50:** project scaffold live on Vercel, plus `types.ts` and Vitest. **16:45:** `components/record/*` (source badge, allergy, condition and medicine lists, lab table with trend line, timeline, flag list). **17:30:** dashboard with flags and edits. **18:00:** landing page and delete-all | P4's demo JSON (16:20) and `analyzeRecord` (17:00) | Store API for P2 and P3; components for P4 |
| **P2 Document AI** | `/api/extract`, schema and prompt, import page, review queue, cached results | **16:30:** route returns valid JSON for one document. **17:15:** upload, review queue and `acceptItem` working. **17:45:** parallel import of 5 sample documents, cached fallback, consent checkbox, rate limit | P4's documents (2 by 16:20, all 5 by 16:45); P1's store | Extracted items |
| **P3 Sharing** | Encryption, share store, share APIs, share page, viewer | **16:15:** `crypto.ts` with tests. **16:45:** APIs with Redis and in-memory stores, `payload.ts` with tests. **17:30:** share wizard, link and QR, list of active shares with log and revoke. **17:45:** viewer error states, rendering `ClinicianBrief` | P1's store; P4's `ClinicianBrief` (17:30) | The working share flow |
| **P4 Data, rules, brief, story** | Synthetic data and documents, `analyze.ts` with tests, `ClinicianBrief`, README, demo script, video | **16:20:** `demoStart.json`, `demoComplete.json` and 2 documents. **16:45:** remaining documents. **17:00:** rules with tests. **17:30:** `ClinicianBrief`, built from P1's components. **18:15:** README draft and shot list. **19:00:** records the video with P1 | P1's components | Data, rules, brief, documents, story |

Until a dependency is ready, build against stubs. P1, P3 and P4 use `demoComplete.json`. P3 renders the raw payload as JSON until `ClinicianBrief` exists.

**Working rules:**
- Each person edits only the folders they own.
- Shared files (`types.ts`, `layout.tsx`, `package.json`) change only through P1.
- Pull and rebase before every push, and commit in small pieces.
- Every merge to `main` deploys automatically.
- **Nobody deploys while the video is being recorded.**

---

## I. Timeline (IST)

| Time | What happens |
|---|---|
| 15:15–15:30 | Everyone reads the plan; assign P1–P4; agree on the name |
| 15:30–15:50 | **Setup.** P1: scaffold the project, push it, import it into Vercel, get the production URL live, commit `types.ts`. P2: Gemini API key from Google AI Studio into Vercel and `.env.local`. P3: create the Upstash Redis database and add its environment variables. P4: data sheet for the persona |
| 15:50–17:00 | **Sprint 1: each person builds a working slice against the fixtures** (see H for times) |
| 17:00–17:10 | **Checkpoint 1.** Merge everything, deploy, each person demos for 2 minutes. Apply the fallback ladder (K) if anyone is behind |
| 17:10–18:15 | **Sprint 2: connect the parts.** Import feeds the vault, the vault feeds the share, the share feeds the brief, plus flags and edits. P4 drafts the README and shot list |
| **18:15** | **FEATURE FREEZE** |
| 18:15–19:00 | **Integrate and harden in production.** Two full golden-path runs (a fresh browser and a phone). Bug fixes only. Tests green. Final wording and disclaimers. Screen-record a rough backup run |
| 19:00–19:45 | **Record the video** in segments. P4 narrates, P1 drives. P2 and P3 fix bugs on branches only, with no deploys |
| 19:45–20:10 | Edit and upload the video (unlisted). Finish the README with links, screenshots and disclosures. Make the repo public. Commit `.env.example` |
| 20:10–20:30 | **Submit, aiming for 20:30.** 20:30–21:00 is emergency buffer only |

---

## J. Definition of done
- [ ] The public URL works on desktop and mobile. "Load demo patient (synthetic)" works in a fresh browser.
- [ ] Importing the 5 sample documents gives items with excerpts. Accept, edit and reject all work. Accepted items carry their document source.
- [ ] The dashboard shows allergies with an explicit status, conditions, current medicines, lab results with the HbA1c trend, and a timeline. Every item has a source label.
- [ ] These flags appear, each explaining why: duplicate metformin, possibly outdated amlodipine, items waiting for review, recent results on file, and the forgotten allergy as a newly documented fact.
- [ ] The share wizard (sections, exclusions, expiry) produces a link and QR code. The brief renders in a different browser and shows "1 item withheld".
- [ ] The Upstash console shows only ciphertext. A link without `#k=` shows the "incomplete link" message.
- [ ] Revoking makes the viewer show "revoked". An expired link shows "expired". The access log lists each time the link was opened.
- [ ] `npm test` passes: flag rules, encryption round trip and tamper failure, payload scoping (no pending items, no withheld items, flags computed only on the shared subset).
- [ ] No secrets are in the repo. Environment variables are set on Vercel. `.env.example` is committed.
- [ ] The README covers: problem, solution, live URL, video, setup, architecture, privacy and limitations, how AI is used (what is sent to Google's Gemini API, when, and under which terms), every service and open-source library used, the synthetic-data notice, and the roadmap.
- [ ] The 3–4 minute video plays without logging in. The submission form is done by 20:30.

---

## K. Fallback strategy
- **Behind at 17:00.** Cut features in this order, keeping the golden path intact:
  1. QR code.
  2. Manual add form.
  3. Access-log interface (keep revoke).
  4. Timeline (keep the lists).
  5. Editing inside the review queue (keep accept and reject).
- **AI extraction is unreliable or slow.**
  - Extract at most 2 documents at a time. On a 429 (rate limited), retry once.
  - If PDFs misbehave, switch the demo documents to page images.
  - After 45 s per document, fall back to the cached result, labelled "cached extraction".
  - If live extraction still fails at 17:45, demo the import with the cached results **and say so in the video and README**, or start the demo from the complete record. **Never present cached results as live.**
- **Encryption still buggy at 17:30.** Store the share snapshot unencrypted. It stays scoped, expiring, revocable and logged. Remove every "the server can't read it" claim.
- **Upstash unavailable.** Switch to Neon or Supabase Postgres behind the same `ShareStore` interface, with expiry checked on each read.
- **A late deploy breaks production.** Use Vercel's Instant Rollback to the last good deployment and record from that.
- **Video risk.** Keep the 18:15–19:00 backup recording, and record in segments so one mistake doesn't cost a full retake.

---

## L. First five actions after approval
1. **(All, 5 min)** Confirm the deadline timezone, assign P1–P4, and decide whether to adopt "Handover".
2. **(P1)** Run `npx create-next-app@latest` (TypeScript, Tailwind, App Router, `src/`) in this repo. Push to `main`, then import the repo in the Vercel dashboard so production is live by 15:50. Commit `src/lib/types.ts` from section F and add Vitest.
3. **(P2 and P3, in parallel)** P2 creates a Gemini API key in Google AI Studio and, if possible, enables billing on its Cloud project so the paid-service data terms apply. P3 creates an Upstash Redis database. Add `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel and to `.env.local`. Commit `.env.example` without values.
4. **(P4)** Write Meena's data sheet, then `demoStart.json` and `demoComplete.json` (by 16:20), then the 5 synthetic documents.
5. **(All)** Start building against `demoComplete.json` straight away. Set an alarm for the 17:00 checkpoint. Start the README with the list of services and libraries.

## Verification (how we will check it works)
- **Unit tests (`npm test`, Vitest):**
  - Each flag rule, including that a refill of the same product does not count as a duplicate.
  - Encryption round trip, and that a wrong key or tampered ciphertext fails.
  - `buildSharePayload` scoping.
- **API smoke test in production:** create a share, open it (an access entry appears), revoke it (it returns 410), and check expiry with a 1-minute expiry option that exists only in development.
- **Two manual golden-path runs** in production: a fresh browser plus a phone, before 18:15 and again before recording.
- **Inspect Upstash** to confirm it stores only ciphertext.

Sources:
- [NHA ABHA app deck](https://abdm.gov.in:8081/uploads/ABHA_App_8413f7c295.pdf)
- [HL7 SMART Health Links spec](https://hl7.org/fhir/uv/smart-health-cards-and-links/links-specification.html)
- [Fierce Healthcare on CareBridge/Elevance](https://www.fiercehealthcare.com/finance/elevance-health-scoop-value-based-care-company-carebridge)
- [Gemini document processing docs](https://ai.google.dev/gemini-api/docs/generate-content/document-processing?authuser=0)
- [Gemini JSON mode docs (Node)](https://ai.google.dev/gemini-api/docs/json-mode?lang=node)
- [Google blog on Gemini structured outputs](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-structured-outputs/)
- [Gemini API Additional Terms](https://ai.google.dev/terms)
- [Developer forum report on inline PDFs](https://discuss.ai.google.dev/t/flash-2-5-pdf-analysis-ai-studio-vs-api/80154)
