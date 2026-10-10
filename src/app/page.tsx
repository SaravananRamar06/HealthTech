import Link from 'next/link';

// Owner: P1. Landing page.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-12">
      {/* Top Warning Banner */}
      <div className="rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <span>
          <strong>Hackathon Demonstration Prototype:</strong> Built for the HealthTech hackathon using synthetic data only. <strong>Do not upload real medical records.</strong> Not a certified medical device.
        </span>
        <span className="font-semibold text-amber-900 bg-amber-200/60 rounded px-2 py-0.5">Synthetic Only</span>
      </div>

      {/* Hero Header */}
      <header className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2">
          <span className="rounded bg-indigo-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-800">
            Handover
          </span>
          <span className="text-xs text-zinc-500">Local-First · Provenance-Backed · Zero-Knowledge Share</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
          Turn scattered prescriptions &amp; reports into a brief your next doctor can trust.
        </h1>
        <p className="text-lg text-zinc-600 leading-relaxed max-w-3xl">
          Every clinical fact links directly to its source document and patient confirmation.
          Shared with zero-knowledge AES-256-GCM encryption where <em>only the people you choose see it, for as long as you choose</em>.
        </p>
      </header>

      {/* 3 Step Golden Path Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-700 text-sm">
              1
            </span>
            <h2 className="text-base font-bold text-zinc-900">Document Ingestion</h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Upload photos, PDFs, or discharge summaries. Google Gemini AI extracts facts into a staging queue where you confirm or correct every detail.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-zinc-100">
            <span className="text-[11px] font-semibold text-indigo-600">Verbatim document excerpts</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 font-bold text-amber-700 text-sm">
              2
            </span>
            <h2 className="text-base font-bold text-zinc-900">Reconcile &amp; Flag</h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Pure TypeScript rule engine automatically flags duplicate ingredients across prescribers, outdated medicines, and forgotten allergies.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-zinc-100">
            <span className="text-[11px] font-semibold text-amber-700">Strictly for clinician review</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 font-bold text-emerald-700 text-sm">
              3
            </span>
            <h2 className="text-base font-bold text-zinc-900">Encrypted Sharing</h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Encrypt your summary in the browser before upload. The key stays solely in the link fragment (#k=). Links expire automatically and can be revoked.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-zinc-100">
            <span className="text-[11px] font-semibold text-emerald-700">Server cannot read data</span>
          </div>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/vault"
          className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 transition-colors"
        >
          Open Health Vault →
        </Link>
        <Link
          href="/vault/import"
          className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Import Documents
        </Link>
      </div>

      {/* Architecture & Privacy Commitments */}
      <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700">
          Architecture &amp; Privacy Design
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 text-xs text-zinc-600 leading-relaxed">
          <div className="space-y-1">
            <p className="font-semibold text-zinc-800">Local-First Storage</p>
            <p>
              Your health vault lives inside your browser (IndexedDB and localStorage). We do not require patient accounts or store unencrypted medical profiles on our database.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-zinc-800">SMART Health Links Inspired</p>
            <p>
              Shares use AES-256-GCM. The decryption key exists only in the URL #fragment, which modern browsers never transmit in HTTP requests to the server.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-zinc-800">Mandatory Human Review</p>
            <p>
              AI is treated as a transcription assistant, never an authoritative clinician. Extracted facts remain in a private staging queue until you review them.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-zinc-800">Full Auditability &amp; Revocation</p>
            <p>
              View timestamps and browser user-agents each time a clinician opens your brief. Revoking a link permanently deletes the ciphertext from the server.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
