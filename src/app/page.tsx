import Link from "next/link";

// Owner: P1. Landing page.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Prototype for a hackathon demo. It uses synthetic data only.{" "}
        <strong>Do not upload real medical records.</strong> Not a medical device.
      </div>

      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">Handover</h1>
        <p className="text-lg text-zinc-600">
          Turn the folder of prescriptions, lab reports and WhatsApp photos into a one-screen brief your next
          doctor can trust. Every fact traces back to its source, and only the people you choose see it, for as
          long as you choose.
        </p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-3">
        <li className="rounded-lg border p-4">
          <p className="font-medium">1. Import</p>
          <p className="text-sm text-zinc-600">Upload documents. Review every extracted fact before it is saved.</p>
        </li>
        <li className="rounded-lg border p-4">
          <p className="font-medium">2. Reconcile</p>
          <p className="text-sm text-zinc-600">See possible duplicates, outdated medicines and recent results.</p>
        </li>
        <li className="rounded-lg border p-4">
          <p className="font-medium">3. Share</p>
          <p className="text-sm text-zinc-600">Send only what you choose, with an expiry, and revoke at any time.</p>
        </li>
      </ol>

      <div className="flex flex-wrap gap-3">
        <Link href="/vault" className="rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700">
          Open my vault
        </Link>
      </div>
    </main>
  );
}
