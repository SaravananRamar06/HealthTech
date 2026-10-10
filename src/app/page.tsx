import Link from 'next/link';
import { ArrowRight, FileText, Check, Lock, AlertCircle, ShieldCheck, Layers, Clock, ArrowUpRight } from 'lucide-react';
import demo from '@/lib/demo/demoComplete.json';

export default function Home() {
  const latestLab = demo.labs.find((lab) => lab.test === 'HbA1c' && lab.date === '2026-09-12');
  return (
    <main className="app-shell home-shell">
      <div className="notice-banner flex flex-wrap items-center gap-2 px-4 py-3 text-xs text-amber-950 border">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
        <span><strong>Demonstration only.</strong> Synthetic data · <strong>Do not upload real medical records.</strong> Not a certified medical device.</span>
      </div>

      <section className="home-hero">
        <div className="space-y-7 animate-slide-up">
          <p className="eyebrow flex items-center gap-2"><span className="h-px w-8 bg-[var(--teal-action)]" /> Your history. In your hands.</p>
          <h1 className="hero-title">Care moves forward.<br />Your records <em>should too.</em></h1>
          <p className="hero-description">Bring scattered prescriptions and reports together in one clear health brief. Review every fact, keep its source, and choose what your next doctor sees.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/vault" className="button-primary">Open Health Vault <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/vault/import" className="button-secondary"><FileText className="h-4 w-4" /> Import Documents</Link>
          </div>
          <div className="hero-footnotes">
            <span><Layers className="h-3.5 w-3.5" /> Stored in your browser</span>
            <span><Lock className="h-3.5 w-3.5" /> Encrypted shares</span>
            <span><Clock className="h-3.5 w-3.5" /> Revoke anytime</span>
          </div>
        </div>

        <div className="document-scene animate-fade-in">
          <div className="document-back" aria-hidden="true" />
          <article className="document-paper" aria-label="Example brief from the synthetic demo patient">
            <header>
              <div><p className="paper-label">Handover / patient brief</p><h2>{demo.profile.name}</h2><p className="mt-1 text-xs text-[color:var(--muted-grey)]">Synthetic patient · Demonstration only</p></div>
              <ShieldCheck className="h-7 w-7 shrink-0 text-[color:var(--teal-text)]" />
            </header>
            <div className="paper-row">
              <p className="paper-label text-[#a55435]">Recorded allergy</p>
              <p className="text-sm font-semibold text-[color:var(--brand-ink)]">{demo.allergies[0].substance}</p>
              <p className="mt-1 text-xs text-[color:var(--muted-grey)]">Reaction: {demo.allergies[0].reaction}</p>
              <span className="paper-source"><FileText className="h-3 w-3" /> From document · confirmed by patient</span>
            </div>
            <div className="paper-row flex items-center justify-between gap-4">
              <div><p className="paper-label">Latest HbA1c on file</p><p className="text-xs text-[color:var(--muted-grey)]">{latestLab?.date}</p></div>
              <p className="text-3xl font-medium tracking-tight text-[color:var(--brand-ink)]">{latestLab?.value}<span className="ml-1 text-sm">{latestLab?.unit}</span></p>
            </div>
            <div className="paper-row">
              <p className="paper-label">Every fact has a source</p>
              <p className="text-xs leading-relaxed text-[color:var(--muted-grey)]">Patient-reported details stay distinct from facts confirmed from a document.</p>
            </div>
          </article>
          <p className="paper-stamp"><Check className="h-4 w-4" /> Reviewed by you. Shared on your terms.</p>
        </div>
      </section>

      <section>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2"><p className="eyebrow">A little clarity at every step</p><h2 className="editorial-heading">From a folder of papers<br />to a clearer conversation.</h2></div>
          <p className="max-w-xs text-sm text-[color:var(--muted-grey)]">Documents in. A reviewed record.<br />A brief ready for the next visit.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { number: '01', title: 'Bring it all together', detail: 'Import photos, prescriptions, discharge papers, and lab reports. AI extracts facts with verbatim excerpts for your review.', note: 'Photos & PDFs', icon: FileText },
            { number: '02', title: 'Make the record yours', detail: 'Confirm, correct, or reject each extracted fact. Review duplicate ingredients, older prescriptions, and documented lab trends.', note: 'Human review comes first', icon: Check },
            { number: '03', title: 'Share just what matters', detail: 'Choose sections and individual items, set an expiry, and share a brief by link or QR code. See opens and revoke access.', note: 'Expiring & revocable', icon: Lock },
          ].map((step) => (
            <article key={step.number} className="glass-panel glass-panel-hover step-card">
              <p className="step-number">{step.number}</p>
              <h3 className="text-lg font-semibold tracking-tight text-[color:var(--brand-ink)]">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-grey)]">{step.detail}</p>
              <p className="mt-6 flex items-center gap-2 border-t border-[var(--border-card)] pt-4 text-xs font-medium text-[color:var(--teal-text)]"><step.icon className="h-4 w-4" />{step.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section story-panel">
        <div className="space-y-4">
          <p className="eyebrow">Meet the demo patient</p>
          <h2 className="editorial-heading">A new city.<br />The same health story.</h2>
          <p className="text-sm leading-relaxed text-[color:var(--muted-grey)]">Meena Krishnan, 58, is moving from Chennai to Bengaluru. Her daughter Priya helps prepare the records for a visit with Dr. S. Rao.</p>
          <Link href="/vault" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--teal-text)]">Explore Meena&apos;s story <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="story-list">
          <div><span className="eyebrow pt-1">01</span><div><h3 className="text-sm font-semibold text-[color:var(--brand-ink)]">An allergy hidden in an old discharge summary</h3><p className="mt-1 text-sm text-[color:var(--muted-grey)]">The original document records a rash after amoxicillin-clavulanate. Its excerpt stays attached to the fact.</p></div></div>
          <div><span className="eyebrow pt-1">02</span><div><h3 className="text-sm font-semibold text-[color:var(--brand-ink)]">The same ingredient, different prescriptions</h3><p className="mt-1 text-sm text-[color:var(--muted-grey)]">Metformin appears in prescriptions from different doctors. Handover brings it to attention for review.</p></div></div>
          <div><span className="eyebrow pt-1">03</span><div><h3 className="text-sm font-semibold text-[color:var(--brand-ink)]">A brief with clear boundaries</h3><p className="mt-1 text-sm text-[color:var(--muted-grey)]">Priya can withhold an item and set a 24-hour expiry. The clinician sees that the shared record is partial.</p></div></div>
        </div>
      </section>

      <section className="home-section glass-panel-forest privacy-panel">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2"><p className="eyebrow text-[#8ccab5]">Built around your control</p><h2 className="editorial-heading text-[#fffefa]">Private by design.<br />Clear about the boundaries.</h2></div>
          <Lock className="h-8 w-8 text-[#8ccab5]" />
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          {[
            ['Your browser is your vault', 'Your record lives in localStorage and IndexedDB on this device. There is no account, automatic sync, or device backup.'],
            ['Only selected facts leave the vault', 'Shares are encrypted with AES-256-GCM in your browser. The key stays in the link fragment; the server stores ciphertext.'],
            ['AI output waits for your review', 'Extracted facts enter a private review queue. Confirm or correct them before they enter the record or can be shared.'],
            ['Access has an end', 'Choose an expiry, view when a link was opened, and revoke it. This sharing pattern is inspired by SMART Health Links.'],
          ].map(([title, detail]) => <div key={title} className="border-l border-[var(--teal-text)] pl-4"><h3 className="text-sm font-semibold text-[#fffefa]">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[#d3e8dc]">{detail}</p></div>)}
        </div>
      </section>
      <footer className="mt-8 flex flex-wrap justify-between gap-3 text-xs text-[color:var(--muted-grey)]"><span>Handover · Patient-controlled continuity</span><span>Synthetic demonstration · No diagnosis, treatment, or dose advice</span></footer>
    </main>
  );
}
