# Handover — Hackathon Status & Winning Strategy Guide

**Event Date:** Saturday, 10 October 2026  
**Current Time:** ~16:48 IST  
**Handover to Claude Code:** 18:10 IST (~1h 22m remaining)  
**Feature Freeze:** 18:15 IST  
**Target Submission:** 20:30 IST (Deadline: 21:00 IST)

---

## 1. What Has Been Completed So Far

The entire core application has been built, tested, and verified end-to-end. There are **0 compilation errors, 0 linter warnings, and 26 passing tests**.

### A. Core Architecture & Backend
- **Shared Type Contract (`src/lib/types.ts`):** 100% strictly adhered to with zero breaking changes.
- **Client-Side Cryptography (`src/lib/share/crypto.ts`):**
  - In-browser AES-256-GCM encryption with 96-bit random IVs using the native Web Crypto API (`crypto.subtle`).
  - The 256-bit encryption key is exported as base64url and appended **only to the URL `#fragment`** (`#k=...`). It is mathematically impossible for the server to read the health summary.
  - Passes 4 unit tests (encryption roundtrip, wrong key rejection, ciphertext tampering detection, IV tampering detection).
- **Scoping & Zero-Leak Engine (`src/lib/share/payload.ts`):**
  - Filters sections and withholds individual items.
  - Re-runs the rule engine *strictly on the shared subset* so withheld items never leak through flag text or item IDs.
  - Accurately tracks `withheldCount` and strips raw file references.
  - Passes 5 unit tests.
- **Share Storage & Revocation Engine (`src/lib/share/store.ts`):**
  - Dual-mode architecture: Production Upstash Redis + in-memory fallback for local development and offline testing.
  - Generates 128-bit share IDs and 256-bit `manageToken` credentials stored on the server only as SHA-256 hashes.
  - Expiry TTL enforcement and instant revocation markers.
  - Passes 3 unit tests.
- **Share API Routes (`src/app/api/shares/**`):**
  - `POST /api/shares`: Validates payload sizes (≤300KB) and registers encrypted shares.
  - `GET /api/shares/[id]`: Serves ciphertext, records access audit events (timestamp + user agent), returns HTTP 410 if revoked, and HTTP 404 if expired.
  - `DELETE /api/shares/[id]`: Authenticated revocation endpoint via Bearer token.
  - `GET /api/shares/[id]/access`: Authenticated access log retrieval.
  - Passes 2 integration tests.
- **AI Document Extraction Engine (`src/app/api/extract/route.ts`):**
  - Powered by Google Gemini 2.5 Flash via `@google/genai`.
  - Strict JSON-mode structured outputs validating clinical facts, confidence scores (`high`, `medium`, `low`), and verbatim quotes into `excerpt`.
  - Deterministic offline cache fallback (`src/lib/extract/demoCache.ts`) so the demo works seamlessly even without an API key or under rate limits.
  - Passes 2 tests.
- **Clinical Rule Engine (`src/lib/analyze.ts`):**
  - 7 explainable, deterministic rules: duplicate molecule detection across different brand prescribers (refills of the same product count as one), allergen-medication matches, outdated prescriptions (>180 days), unrecorded allergy status, items awaiting patient review, recent lab results (≤90 days), and patient-reported items.
  - Passes 10 unit tests.

### B. User Interface & Workflow
- **Local-First Patient Vault (`src/app/vault/page.tsx`):**
  - Stored in the browser (`localStorage` + `IndexedDB` via `idb-keyval`). No centralized database of patient records.
  - Demo switcher: Toggle between the unreviewed starting baseline (`demoStart.json`) and the fully reconciled state (`demoComplete.json`).
  - Interactive clinical reconciliation flags, status controls, and "Mark stopped" medication actions.
- **Document Ingestion & Human-in-the-Loop Review Queue (`src/app/vault/import/page.tsx`):**
  - Mandatory AI processing consent checkbox before document upload.
  - File upload dropzone (PDF, JPEG, PNG, WebP) + "Load 5 Sample Documents" demo button.
  - Staging queue: Every extracted fact requires patient acceptance or editing before entering the vault.
- **Scoped Share Wizard & Management (`src/app/vault/share/page.tsx`):**
  - Custom recipient label, expiry duration (1 hour, 24 hours, 7 days), and section selection.
  - Granular item exclusions (withholding items) with a clinical safety warning.
  - Instant QR code generation (`qrcode.react`) and share link copy.
  - Active shares table with live access logs and one-click revocation.
- **Clinician Brief Viewer (`src/app/s/[id]/page.tsx` & `src/components/ClinicianBrief.tsx`):**
  - Client-side decryption from URL fragment key.
  - 30-second consult view: Allergies at the top, flags for review, active medicines with generic ingredients and prescribers, HbA1c/TSH longitudinal trend tables, timeline of care events, and "N items withheld by patient" notice.
  - 4 error states handled: Revoked (410), Expired/Missing (404), Incomplete Link (missing `#k=`), and Corrupted Link.
- **Landing Page (`src/app/page.tsx`):**
  - Problem/solution walkthrough, golden path steps, and privacy model disclosures.

### C. Assets, Documentation & Quality
- **5 Synthetic Demo Documents (`public/demo/*`):** Discharge summary (Jan 2025), GP Rx (Mar 2026), Lab report (Apr 2026), Specialist Rx (Jul 2026), and Follow-up Lab report (Sep 2026).
- **Project Documentation (`README.md`):** Complete problem breakdown, solution pitch, architecture diagrams, privacy disclosures, AI terms notice, and setup guide.
- **Quality Metrics:**
  - `npm run lint`: **0 errors, 0 warnings** (React 19 & Next.js 16 compliant).
  - `npm test`: **26/26 passing tests across 6 test suites**.
  - `npm run build`: **10/10 routes successfully generated with Turbopack**.

---

## 2. What Has to Be Done Before Submission

With the code complete and verified, the remaining tasks are operational execution:

```
Timeline to Submission:
16:48 - 18:10 IST: Polish demo script, prep Vercel and repository
18:10 IST:         Claude Code resumes (Handover)
18:15 IST:         FEATURE FREEZE (No new features, bug fixes only)
18:15 - 19:00 IST: Deploy to Vercel, live domain verification, run golden path
19:00 - 19:45 IST: Record the 3–4 minute demo video
19:45 - 20:10 IST: Upload video to YouTube (Unlisted), update README with URL
20:10 - 20:30 IST: Submit project before deadline
```

### Action Checklist
1. **GitHub Repository Sync:**
   - Commit all files and push `main` to GitHub: `git push origin main`.
   - Ensure `.env.local` is not committed (already gitignored).
2. **Vercel Production Deployment:**
   - Import the GitHub repository into Vercel.
   - Configure the 3 environment variables in the Vercel dashboard:
     - `GEMINI_API_KEY`: Google AI Studio API key.
     - `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL.
     - `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST Token.
   - Deploy and verify the production URL (e.g., `https://handover-health.vercel.app`).
3. **Production Smoke Test:**
   - Open production URL on a laptop and on a mobile phone.
   - Test "Load Demo", create a share link, open it in an Incognito window, verify decryption, and test live revocation.
4. **Record the Demo Video (3–4 minutes):**
   - Follow the script outlined in Section 3 below.
5. **Final Submission:**
   - Paste the live Vercel URL and YouTube video link into `README.md`.
   - Submit the hackathon form by 20:30 IST.

---

## 3. What Needs to Be Done to WIN the Hackathon

Judging criteria usually reward **clarity of thought, technical depth, honest innovation, and a compelling demo narrative**. Here is how to maximize every category:

### Judging Criteria Breakdown & Our Edge

| Criterion | Weight | What Judges Look For | Our Edge & Defense |
|---|---|---|---|
| **Technical Execution** | **35%** | Robust architecture, working code, unit tests, security | • In-browser AES-256-GCM encryption where the server never sees the key.<br>• Local-first storage (localStorage + IndexedDB).<br>• Next.js 16 App Router with Turbopack & Partial Prerendering.<br>• 26 automated unit & integration tests covering flag logic, crypto roundtrip, and zero-leak scoping. |
| **Innovation & Differentiation** | **20%** | Novelty, unique angle, not just another clone | • **Twist on Provenance:** Every fact carries a verbatim document excerpt and source badge (*Patient-reported* vs *Confirmed by patient* vs *Corrected by patient*).<br>• **Human-in-the-loop AI:** AI is an assistant, not a doctor; unreviewed facts can never be shared.<br>• **SMART Health Links pattern** adapted for the paper and WhatsApp long tail. |
| **Feasibility & Real-World Impact** | **20%** | Practicality, cost, regulatory reality | • Does **not** require integration with hospital EHRs (zero provider onboarding friction). Doctors need only a standard web browser.<br>• Designed specifically for the Indian healthcare reality (brand-name polypharmacy, WhatsApp photos, clinics without ABDM).<br>• Low cost per extraction with built-in offline caching. |
| **Demo & Presentation** | **15%** | Clear story, relatable problem, strong "aha" moment | • Compelling fictional persona (Meena Krishnan & daughter Priya).<br>• The "Aha" moment: Discovering duplicate Metformin prescribed across two independent doctors.<br>• The "Control" moment: Revoking access live and showing the doctor's screen turn to "Access Revoked". |
| **Deployment & Completeness** | **10%** | Live URL, documentation, clear disclaimers | • Fully deployed on Vercel.<br>• Transparent README disclosing all AI usage, libraries, and synthetic data boundaries.<br>• Strict compliance disclaimers (never claims to be a medical device or HIPAA/DPDP compliant). |

---

### The Winning Demo Script (3 minutes 45 seconds)

Follow this exact sequence during the video recording:

#### 1. The Problem (0:00 – 0:30)
- **Visual:** Show a messy folder of paper prescriptions, lab reports, and WhatsApp forwards.
- **Narrative:** *"Patients with chronic conditions like diabetes and hypertension see multiple doctors over years. Each provider has its own records. In a 10-minute consult with a new doctor, patients rely on memory. Critical allergies are forgotten, tests are repeated, and different doctors accidentally prescribe the same drug under different brand names. Sharing records over WhatsApp has no expiry, no privacy, and no way to revoke."*

#### 2. The Solution: Handover (0:30 – 1:15)
- **Visual:** Open Handover landing page and click **"Open Health Vault"**.
- **Narrative:** *"Handover turns scattered prescriptions and reports into a one-screen brief your next doctor can trust, while keeping you in total control."*
- Click **"Load Demo (Unreconciled Start)"**.
- Show Meena's starting state: *"Notice Meena has three chronic conditions, one patient-reported medicine (Escitalopram), and her allergy status is unrecorded."*

#### 3. Ingestion & Human-in-the-Loop Review (1:15 – 2:00)
- **Visual:** Navigate to `/vault/import`.
- Point out the AI consent checkbox: *"Before anything touches AI, the patient consents. Synthetic data only."*
- Click **"Load 5 Sample Documents"** (or upload the sample PDFs).
- Show the **Staging Review Queue**:
  - Point to the verbatim document excerpt: *"Every fact has proof. Notice this allergy extracted from a 2025 discharge summary: 'Patient developed urticarial rash after amoxicillin-clavulanate'."*
  - Correct one dose or click **"Confirm All"**.
  - Show that accepting the allergy immediately updates Meena's allergy status to **"Has Allergies"**.

#### 4. The "Aha!" Moment — Clinical Reconciliation (2:00 – 2:40)
- **Visual:** Return to `/vault`.
- Highlight the **Reconciliation Flags**:
  - ⚠️ **Duplicate Ingredient Flag:** *"Look here: Dr. Iyer prescribed Metfora 500, and Dr. Menon prescribed Glimfora-M1. Two different brand names, but both contain Metformin. Handover flags the duplicate molecule before the visit so the patient doesn't accidentally double-dose."*
  - ⚠️ **Outdated Medicine Flag:** *"Amlodipine was prescribed in Jan 2025—over 180 days ago. Priya knows her mother stopped taking it, so she clicks 'Mark stopped'. The flag clears instantly."*
  - Show the **HbA1c trend**: *"The lab trend shows HbA1c improving from 8.4% to 7.6%, preventing Dr. Rao from needlessly ordering repeat blood tests."*

#### 5. Zero-Knowledge Sharing & Scoping (2:40 – 3:15)
- **Visual:** Click **"Share Summary"** (`/vault/share`).
- Set Recipient: `Dr. S. Rao (Endocrinology)`. Expiry: `24 Hours`.
- Under "Exclude Specific Items", check **Escitalopram 10 mg**.
- Point out the safety warning: *"The patient chooses to withhold a sensitive medication. The system warns them, but respects their choice."*
- Click **"Generate Encrypted Link & QR Code"**:
  - *"The summary is encrypted right in the browser with AES-256-GCM. The encryption key is in the URL fragment after #k=. Our server receives only ciphertext and never has the key."*

#### 6. Clinician Experience & Live Revoke (3:15 – 3:45)
- **Visual:** Open the share link in an Incognito window (simulating Dr. Rao's phone/browser).
- Show the **Clinician Brief**:
  - *"Dr. Rao sees a clean 30-second summary. Allergies at the top. The duplicate Metformin flag clearly marked 'For Review'. A banner alerting: '1 item withheld by patient'."*
  - *"Every fact shows its source badge: Patient-reported vs From document · confirmed by patient."*
- Switch back to Priya's window:
  - Open **Access Log**: *"Priya sees that Dr. Rao opened the link 1 minute ago."*
  - Click **"Revoke Access"**.
- Switch back to the doctor's window and refresh:
  - **Screen turns to "Access Revoked by Patient"**: *"The ciphertext was deleted from the server. Access is terminated."*

---

### Winning Traps to Avoid
1. **Never use the word "Verified":** Say *"From document · confirmed by patient"*.
2. **Never claim HIPAA or DPDP compliance:** State clearly that Handover is a hackathon prototype demonstrating privacy-by-design patterns.
3. **Never claim drug-drug interaction detection:** Emphasize that flags are fixed, explainable TypeScript rules (duplicate ingredients, outdated prescriptions, allergen matches), not automated medical diagnoses.
4. **Never claim cached results are live:** In the demo, explain that live Gemini extraction is backed by an offline cache for reliability.

Follow this plan and you have a polished, technically defensible, and compelling winning project!
