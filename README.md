# Handover

Turn the folder of prescriptions, lab reports and WhatsApp photos into a one-screen brief your next doctor can trust. Every fact traces back to its source, and only the people you choose see it, for as long as you choose.

> **Hackathon prototype. Synthetic data only. Do not upload real medical records. Not a medical device.**

<!-- Owner: P4. Fill in every section below before submission (see docs/PLAN.md, section J). -->

## Problem

## Solution

## Live demo and video
- Live URL:
- Demo video:

## How it works (architecture)

## Privacy and security: what is and isn't protected

## How AI is used
Document extraction uses Google's Gemini API. Say what is sent, when, and under which terms (free tier vs paid).

## Third-party services and open-source libraries
- Services: Vercel (hosting), Upstash Redis (share records), Google Gemini API (document extraction)
- Libraries: Next.js, React, Tailwind CSS, zustand, idb-keyval, zod, @google/genai, @upstash/redis, @upstash/ratelimit, qrcode.react, Vitest

## Setup
```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
npm test
```

## Limitations and out of scope

## Roadmap

## Team
