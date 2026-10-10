'use client';

// Owner: P3. Clinician share viewer
// Reads #k= from the URL fragment, fetches ciphertext from /api/shares/:id,
// decrypts in browser WebCrypto, and renders ClinicianBrief.

import { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { decryptPayload } from '@/lib/share/crypto';
import type { SharePayload } from '@/lib/types';
import ClinicianBrief from '@/components/ClinicianBrief';

type ErrorState = 'missing-key' | 'revoked' | 'expired-or-missing' | 'corrupted' | 'network' | null;

function ShareViewerContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const [payload, setPayload] = useState<SharePayload | null>(null);

  useEffect(() => {
    async function loadAndDecrypt() {
      setLoading(true);
      setError(null);

      // 1. Extract decryption key from #k=
      const hash = window.location.hash;
      const kMatch = hash.match(/[#&]k=([^&]+)/);
      if (!kMatch || !kMatch[1]) {
        setError('missing-key');
        setLoading(false);
        return;
      }
      const keyBase64Url = decodeURIComponent(kMatch[1]);

      try {
        // 2. Fetch ciphertext from server
        const res = await fetch(`/api/shares/${id}`, {
          cache: 'no-store',
        });

        if (res.status === 410) {
          setError('revoked');
          setLoading(false);
          return;
        }

        if (res.status === 404) {
          setError('expired-or-missing');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError('network');
          setLoading(false);
          return;
        }

        const data = await res.json();
        const { ciphertext, iv } = data;

        // 3. Decrypt in the browser
        try {
          const decrypted = await decryptPayload(ciphertext, iv, keyBase64Url);
          setPayload(decrypted);
        } catch (decryptErr) {
          console.error('Decryption failed:', decryptErr);
          setError('corrupted');
        }
      } catch (networkErr) {
        console.error('Network request failed:', networkErr);
        setError('network');
      } finally {
        setLoading(false);
      }
    }

    loadAndDecrypt();
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 text-zinc-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium">Decrypting health summary in your browser...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-4 text-center">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm w-full space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 text-xl font-bold">
            !
          </div>

          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-zinc-900">
              {error === 'revoked' && 'Access Revoked'}
              {error === 'expired-or-missing' && 'Share Expired or Not Found'}
              {error === 'missing-key' && 'Incomplete Share Link'}
              {error === 'corrupted' && 'Decryption Failed'}
              {error === 'network' && 'Connection Error'}
            </h1>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {error === 'revoked' &&
                'The patient has revoked access to this summary. The server ciphertext has been permanently deleted.'}
              {error === 'expired-or-missing' &&
                'This share link has expired or the record does not exist on the server.'}
              {error === 'missing-key' &&
                'The decryption key is missing from the link URL fragment (#k=...). Please request a full, intact link from the patient.'}
              {error === 'corrupted' &&
                'The shared data could not be decrypted. The encryption key or ciphertext may have been corrupted or modified.'}
              {error === 'network' &&
                'Could not retrieve the shared summary from the server. Please check your internet connection.'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!payload) {
    return null;
  }

  return <ClinicianBrief payload={payload} />;
}

export default function ShareViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] flex-col items-center justify-center p-4">
          <div className="flex items-center gap-3 text-zinc-600">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-sm font-medium">Loading summary...</p>
          </div>
        </main>
      }
    >
      <ShareViewerContent params={params} />
    </Suspense>
  );
}
