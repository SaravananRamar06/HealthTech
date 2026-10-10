# Handover

Turn the folder of prescriptions, lab reports and WhatsApp photos into a one-screen brief your next doctor can trust. Every fact traces back to its source, and only the people you choose see it, for as long as you choose.

> **Hackathon Prototype Notice:** Built for demonstration purposes using synthetic data only. **Do not upload real medical records.** Handover is not a certified medical device and does not provide medical diagnoses, treatment decisions, or drug–drug interaction screening.

---

## Problem

Patients managing long-term conditions (such as diabetes, hypertension, asthma, and thyroid disorders) accumulate years of disjointed records across multiple doctors, diagnostic labs, and pharmacies. When changing physicians, moving cities, or arriving at an emergency department, care continuity breaks:

1. **Scattered, unstructured records:** Prescriptions on paper pads, PDF lab reports, and WhatsApp photo forwards with no integrated timeline.
2. **Unreliable patient recall:** Critical details—such as an allergy buried in a 2-year-old discharge summary or discontinued doses—are frequently forgotten during brief 10-minute consults.
3. **Prescription overlaps & repeat testing:** Different doctors unintentionally prescribe the same active ingredient under different trade brand names (e.g. Metformin in Metfora and Glimfora-M1). Unchecked recent results lead to redundant, costly lab orders.
4. **Insecure, permanent sharing:** Forwarding unencrypted PDFs over messaging apps offers zero scoping, no expiration, no auditability, and no way to revoke access after the visit.

---

## Solution

**Handover** is a local-first, privacy-engineered clinical brief generator:

- **Provenance on every fact:** Every piece of data carries a source badge:
  - *Patient-reported*
  - *From document · confirmed by patient*
  - *From document · corrected by patient*
- **Human-in-the-loop review queue:** AI extraction assists with ingestion, but unreviewed facts are staged in a private queue and **never shared with clinicians** until explicitly confirmed or edited by the patient.
- **Explainable safety flags:** Pure TypeScript rules flag duplicate molecules across active medicines, outdated prescriptions (>180 days), allergen-medication matches, and unrecorded allergy status—worded strictly "for review".
- **Zero-knowledge sharing:** Encrypted in the patient's browser with AES-256-GCM. The decryption key exists solely in the URL `#fragment`, which modern browsers never transmit to the server. Links expire automatically, can be revoked at any time, and provide access logs.

---

## Live Demo & Synthetic Story

- **Live URL:** [Vercel Deployment URL will be listed here]
- **Demo Video:** [Unlisted Demo Video Link will be listed here]

### Fictional Demo Persona: Meena Krishnan (58/F, Chennai)
- **Background:** Type 2 diabetes, hypertension, primary hypothyroidism. Moving cities and consulting **Dr. S. Rao (Endocrinology)** for the first time.
- **Documents Ingested:**
  1. *Discharge Summary (Jan 2025):* Discovers a forgotten amoxicillin-clavulanate allergy (urticaria) and older amlodipine prescription.
  2. *GP Prescription (Mar 2026, Dr. A. Iyer):* Metfora 500 mg BD, Telmisartan 40 mg OD, Levothyroxine 50 mcg OD.
  3. *Lab Report (Apr 2026):* HbA1c 8.4 %, Fasting Blood Sugar 142 mg/dL, TSH 6.8 µIU/mL.
  4. *Specialist Prescription (Jul 2026, Dr. R. Menon):* Adds Glimfora-M1 (glimepiride + metformin) without knowledge of the GP's separate Metfora prescription.
  5. *Follow-up Lab Report (Sep 2026):* HbA1c drops to 7.6 %, TSH normalizes to 3.1 µIU/mL.
- **Aha Moments:**
  - Duplicate metformin flagged across two different prescribers.
  - Forgotten amoxicillin allergy surfaced and allergy status updated.
  - Priya (daughter/caregiver) marks outdated Amlodipine stopped.
  - Shares a 24-hour expiring brief with Dr. Rao with Escitalopram excluded; brief notes "1 item withheld by patient".

---

## Architecture & Data Flow

```
Patient / Caregiver Browser                 Vercel (Next.js 16)                External Services
┌──────────────────────────────────────┐     ┌────────────────────────────┐    ┌──────────────────────┐
│ Local-First Vault                    │     │ POST /api/extract          │───▶│ Google Gemini API    │
│ • LocalStorage (JSON record)         │────▶│ • Memory only, no storage  │◀───│ (Flash 2.5)          │
│ • IndexedDB (source document files)  │     │ • Deterministic demo cache │    └──────────────────────┘
│ • Rule Engine (analyzeRecord)        │     ├────────────────────────────┤    ┌──────────────────────┐
│                                      │     │ /api/shares & /access      │───▶│ Upstash Redis        │
│ In-Browser Encryption (WebCrypto)    │     │ • Stores ciphertext only   │    │ (Ciphertext + TTL)   │
│ • AES-256-GCM payload encryption     │────▶│ • Validates manageToken    │◀───│ (In-memory fallback) │
│ • Key kept ONLY in link #fragment    │     │ • Manages revocation & logs│    └──────────────────────┘
└──────────────────────────────────────┘     └────────────────────────────┘
                   │
                   ▼ Link: /s/[id]#k=[key]
┌──────────────────────────────────────┐
│ Clinician Browser: /s/[id]#k=...     │
│ 1. Extracts key from window.hash     │
│ 2. Fetches ciphertext from /api/shares│
│ 3. Decrypts locally in browser       │
│ 4. Renders <ClinicianBrief />        │
└──────────────────────────────────────┘
```

---

## Privacy & Security Commitments

### What IS Protected:
- **Zero-knowledge sharing:** The server receives and stores only ciphertext. It never sees the AES-256-GCM key, which resides in the browser URL hash.
- **Local-first record:** The patient's health vault is stored on their device (localStorage & IndexedDB). There are no user accounts, passwords to crack, or central database of patient histories.
- **Automatic expiration:** Redis keys use TTL (Time-To-Live) matching the selected expiry (1 hour, 24 hours, or 7 days). Once expired, ciphertext is permanently evicted.
- **Instant revocation:** Revoking a share deletes the ciphertext from the server immediately and records a revocation marker. Subsequent views return HTTP 410 Gone.
- **Access transparency:** Patients can view timestamps and browser user-agents every time a clinician opens their link.
- **Zero-leak scoping:** Excluded items are stripped before encryption. Flags are recomputed *only* on the shared subset, ensuring withheld medicines never leak through flags or counts.

### What is NOT Protected (Limitations):
- **Recipient screenshots:** Once a clinician views the decrypted brief, Handover cannot prevent them from saving or printing it.
- **Browser cache on local device:** If an untrusted party gains physical access to the patient's unlocked device, they can inspect local storage unless "Delete All" is used.
- **Host integrity:** In-browser encryption depends on the integrity of the JavaScript bundle served by the host (Vercel).

---

## How AI is Used

Document parsing uses **Google Gemini 2.5 Flash** via the official `@google/genai` SDK:
- **Structured output:** Gemini is prompted to extract structured clinical facts conforming to a strict JSON schema.
- **Verbatim provenance:** The model is strictly instructed to copy supporting text verbatim into an `excerpt` field. If text cannot be quoted directly from the document, it is rejected.
- **Data privacy disclosure:** In production with Google AI Studio free tier keys, Google's terms specify that data may be reviewed by human annotators to improve services. For this reason:
  - Handover is strictly configured for **synthetic demonstration data only**.
  - A mandatory consent banner alerts users before any document ingestion.
  - The API route never logs request bodies or stores images.
  - A deterministic offline cache is included for demo documents to operate reliably even without API keys.

---

## Third-Party Services & Open-Source Libraries

- **Framework:** Next.js 16 (Turbopack, App Router, React 19)
- **Styling:** Tailwind CSS v4
- **State & Storage:** Zustand with `persist`, `idb-keyval` (IndexedDB)
- **Cryptographic Engine:** Web Crypto API (SubtleCrypto AES-256-GCM, SHA-256)
- **Validation:** Zod v4
- **Cloud & AI:** Google Gemini API (`@google/genai`), Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`)
- **QR Code:** `qrcode.react`
- **Testing:** Vitest

---

## Setup & Development

### Prerequisites
- Node.js 20+ (tested on Node 24)
- npm 10+

### Installation
```bash
# 1. Clone repository
git clone https://github.com/SaravananRamar06/HealthTech.git
cd HealthTech

# 2. Install dependencies
npm install

# 3. Environment configuration (optional: in-memory store & demo cache work out of the box)
cp .env.example .env.local
# Add GEMINI_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN if available

# 4. Run automated test suite (26 unit & integration tests)
npm test

# 5. Build for production
npm run build

# 6. Start local development server
npm run dev
```

---

## Verification & Test Suite

The test suite validates:
1. `src/lib/analyze.test.ts`: 7 clinical flag rules (duplicate molecules across different brands, refill consolidation, outdated medicines >180 days, allergen matches, unrecorded allergy status, pending items, patient-reported items).
2. `src/lib/share/crypto.test.ts`: AES-256-GCM round trip, wrong key failure, ciphertext tampering detection, IV tampering detection.
3. `src/lib/share/payload.test.ts`: Scoping guarantees, exclusion calculations, zero-leak validation (pending items never shared, withheld items excluded from flags).
4. `src/lib/share/store.test.ts`: In-memory and Redis storage lifecycle, SHA-256 token verification, access log recording, revocation enforcement.
5. `src/app/api/shares/shares.test.ts`: End-to-end API route testing (POST create, GET access, DELETE revoke, 410 response).
6. `src/app/api/extract/extract.test.ts`: Document extraction endpoint testing and schema validation.

---

## Roadmap

- **ABDM / ABHA Integration:** Export to standard Ayushman Bharat Digital Mission (ABDM) / FHIR R4 DiagnosticReport and MedicationStatement profiles.
- **Encrypted Sync:** Encrypted patient vault backup using passphrase-derived keys (Argon2id/PBKDF2).
- **Printable Emergency QR Card:** Compact wallet card with vital allergies, emergency contact, and emergency share link.
- **PIN-Protected Shares:** Optional 4-to-6 digit PIN verified before ciphertext download.
