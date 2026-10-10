'use client';

import Link from 'next/link';
import { ArrowRight, FileText, CheckCircle2, Lock, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { SignatureOrb } from '@/components/SignatureOrb';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-8 sm:py-12">
      {/* Top Prototype Warning Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/80 px-4 py-3 text-xs text-amber-950 shadow-2xs backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            <strong>HealthTech Hackathon Prototype:</strong> Uses strictly synthetic data. <strong>Do not upload real medical records.</strong> Not a certified medical device.
          </span>
        </div>
        <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
          Synthetic Only
        </span>
      </div>

      {/* Hero Section: Editorial Typography + Signature 3D Visual */}
      <section className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-6 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#39A99A]/30 bg-[#DDF2E8]/60 px-3 py-1 text-xs font-semibold text-[#14382f]">
            <Sparkles className="h-3.5 w-3.5 text-[#2b8a7e]" />
            <span>CareBridge Handover · Patient-Controlled Briefs</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-[#14382f] sm:text-5xl sm:leading-[1.15]">
            Turn scattered prescriptions &amp; reports into a brief your next doctor can{' '}
            <span className="text-[#2b8a7e] underline decoration-[#ccebe0] decoration-wavy decoration-2 underline-offset-4">
              trust
            </span>
            .
          </h1>

          <p className="text-base text-[#525d56] sm:text-lg leading-relaxed">
            Every clinical fact traces directly to its original source document. Encrypted in your browser with{' '}
            <strong className="text-[#14382f]">AES-256-GCM</strong> where <em>only the clinician you choose sees it, for as long as you choose</em>.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-xl bg-[#14382f] px-6 py-3.5 text-sm font-semibold text-[#ddf2e8] shadow-sm hover:bg-[#1a473c] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <span>Open Health Vault</span>
              <ArrowRight className="h-4 w-4 text-[#3eb4a4]" />
            </Link>

            <Link
              href="/vault/import"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d3dbcf] bg-white px-5 py-3.5 text-sm font-semibold text-[#202823] shadow-2xs hover:bg-[#f1f4ee] hover:border-[#b8c4b3] transition-all duration-200"
            >
              <FileText className="h-4 w-4 text-[#2b8a7e]" />
              <span>Import Documents</span>
            </Link>
          </div>

          {/* Value Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#e2e7e0]">
            <div>
              <p className="text-xs font-bold text-[#14382f]">Local-First</p>
              <p className="text-[11px] text-[#6e7771]">Lives in your browser storage</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#14382f]">Zero-Knowledge</p>
              <p className="text-[11px] text-[#6e7771]">Key in #fragment only</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#14382f]">Provenance</p>
              <p className="text-[11px] text-[#6e7771]">Verbatim document citations</p>
            </div>
          </div>
        </div>

        {/* Signature 3D Visual */}
        <div className="flex items-center justify-center lg:col-span-5">
          <SignatureOrb />
        </div>
      </section>

      {/* 3 Step Golden Path Cards */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2b8a7e]">
            How Handover Works
          </h2>
          <p className="text-2xl font-bold tracking-tight text-[#14382f]">
            From paper chaos to a clinical brief in 3 steps
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="glass-panel glass-panel-hover flex flex-col justify-between rounded-2xl p-6">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ddf2e8] text-[#14382f] font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-[#14382f]">Document Ingestion</h3>
              <p className="text-xs text-[#525d56] leading-relaxed">
                Drop in photos, discharge papers, or PDF lab results. Multimodal AI extracts facts into a staging queue with confidence badges and verbatim excerpts.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#e2e7e0]/80">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2b8a7e]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Human-in-the-loop review
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="glass-panel glass-panel-hover flex flex-col justify-between rounded-2xl p-6">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-[#14382f]">Reconcile &amp; Flag</h3>
              <p className="text-xs text-[#525d56] leading-relaxed">
                Deterministic rule engine surfaces duplicate molecules prescribed under different brand names, forgotten allergies, and outdated regimens.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#e2e7e0]/80">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
                <AlertCircle className="h-3.5 w-3.5" />
                Pure explainable rules
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="glass-panel glass-panel-hover flex flex-col justify-between rounded-2xl p-6">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14382f] text-[#3eb4a4] font-bold text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-[#14382f]">Zero-Knowledge Share</h3>
              <p className="text-xs text-[#525d56] leading-relaxed">
                Browser encrypts only the sections you pick. The clinician receives a 30-second summary via QR code. Our servers store only ciphertext.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#e2e7e0]/80">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#14382f]">
                <Lock className="h-3.5 w-3.5 text-[#2b8a7e]" />
                Expiring &amp; revocable links
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Persona Spotlight */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e7e0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#ddf2e8] px-2 py-0.5 text-xs font-bold text-[#14382f]">
                DEMO STORY
              </span>
              <span className="text-xs text-[#6e7771]">Chennai $\rightarrow$ Bengaluru Relocation</span>
            </div>
            <h3 className="text-xl font-bold text-[#14382f] mt-1">
              Meena Krishnan, 58 &amp; Daughter Priya (Caregiver)
            </h3>
          </div>
          <Link
            href="/vault"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#14382f] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#1b4b3f] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#3eb4a4]" />
            <span>Load Persona in Vault</span>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-1.5">
            <span className="font-bold text-rose-900 block">The Forgotten Allergy</span>
            <p className="text-rose-800 leading-relaxed">
              Discharge summary from Jan 2025 buried a severe rash reaction to Amoxicillin-clavulanate that Meena had forgotten to mention.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
            <span className="font-bold text-amber-900 block">Duplicate Metformin</span>
            <p className="text-amber-800 leading-relaxed">
              GP prescribed <em>Metfora 500</em> while Diabetologist prescribed <em>Glimfora-M1</em>. Handover reconciles the identical molecule across doctors.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
            <span className="font-bold text-emerald-900 block">Scoped Clinician Brief</span>
            <p className="text-emerald-800 leading-relaxed">
              Dr. S. Rao receives a 24-hour expiring brief. Priya withholds Escitalopram 10 mg; the brief transparently states &quot;1 item withheld&quot;.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture & Privacy Commitments */}
      <section className="glass-panel-forest rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3eb4a4]">
            Trust &amp; Engineering
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-white">
            Privacy Built into the Protocol
          </h3>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 text-xs text-[#ddf2e8]/90 leading-relaxed">
          <div className="space-y-1.5 border-l-2 border-[#3eb4a4] pl-3.5">
            <p className="font-bold text-white text-sm">Local-First Storage</p>
            <p>
              Your health vault lives inside your browser (IndexedDB and localStorage). We do not require patient accounts or store unencrypted medical profiles on our database.
            </p>
          </div>

          <div className="space-y-1.5 border-l-2 border-[#3eb4a4] pl-3.5">
            <p className="font-bold text-white text-sm">SMART Health Links Inspired</p>
            <p>
              Shares use AES-256-GCM. The decryption key exists only in the URL #fragment, which modern browsers never transmit in HTTP requests to the server.
            </p>
          </div>

          <div className="space-y-1.5 border-l-2 border-[#3eb4a4] pl-3.5">
            <p className="font-bold text-white text-sm">Mandatory Human Review</p>
            <p>
              AI is treated as a transcription assistant, never an authoritative clinician. Extracted facts remain in a private staging queue until you review them.
            </p>
          </div>

          <div className="space-y-1.5 border-l-2 border-[#3eb4a4] pl-3.5">
            <p className="font-bold text-white text-sm">Full Auditability &amp; Revocation</p>
            <p>
              View timestamps and browser user-agents each time a clinician opens your brief. Revoking a link permanently deletes the ciphertext from the server.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
