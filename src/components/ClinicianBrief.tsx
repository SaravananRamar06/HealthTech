import type { SharePayload } from '@/lib/types';

// Owner: P4. STUB: replace with the real one-screen brief (allergies first, flags "for review",
// medicines with sources, lab trend, timeline, "N items withheld" banner, label legend, disclaimer).
// Keep the props; P3's viewer page renders <ClinicianBrief payload={...} />.
export default function ClinicianBrief({ payload }: { payload: SharePayload }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-zinc-50 p-4 text-xs">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}
