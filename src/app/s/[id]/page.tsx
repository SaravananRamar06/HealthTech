'use client';

// Owner: P3. Clinician share viewer
// Reads #k= from the URL fragment, fetches ciphertext from /api/shares/:id,
// decrypts in browser WebCrypto, and renders ClinicianBrief.

import { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { decryptPayload } from '@/lib/share/crypto';
import type { SharePayload } from '@/lib/types';
import ClinicianBrief from '@/components/ClinicianBrief';
import {
  ShieldAlert,
  Clock,
  Key,
  AlertOctagon,
  WifiOff,
  ArrowLeft,
  Loader2,
  Lock,
} from 'lucide-react';

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
    let loadVersion = 0;
    async function loadAndDecrypt() {
      const version = ++loadVersion;
      setLoading(true);
      setError(null);
      setPayload(null);

      // 1. Extract decryption key from #k=
      const hash = window.location.hash;
      const kMatch = hash.match(/[#&]k=([^&]+)/);
      if (!kMatch || !kMatch[1]) {
        setError('missing-key');
        setLoading(false);
        return;
      }
      let keyBase64Url: string;
      try {
        keyBase64Url = decodeURIComponent(kMatch[1]);
      } catch {
        setError('corrupted');
        setLoading(false);
        return;
      }

      try {
        // 2. Fetch ciphertext from server
        const res = await fetch(`/api/shares/${id}`, {
          cache: 'no-store',
        });
        if (version !== loadVersion) return;

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
        if (version !== loadVersion) return;
        const { ciphertext, iv } = data;

        // 3. Decrypt in the browser
        try {
          const decrypted = await decryptPayload(ciphertext, iv, keyBase64Url);
          if (version !== loadVersion) return;
          setPayload(decrypted);
        } catch (decryptErr) {
          if (version !== loadVersion) return;
          console.error('Decryption failed:', decryptErr);
          setError('corrupted');
        }
      } catch (networkErr) {
        if (version !== loadVersion) return;
        console.error('Network request failed:', networkErr);
        setError('network');
      } finally {
        if (version === loadVersion) setLoading(false);
      }
    }

    loadAndDecrypt();
    window.addEventListener('hashchange', loadAndDecrypt);
    return () => {
      loadVersion++;
      window.removeEventListener('hashchange', loadAndDecrypt);
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="glass-panel flex flex-col items-center gap-4 rounded-3xl p-8 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-[color:var(--brand-ink)]">
            <Lock className="h-7 w-7 text-[color:var(--teal-text)] animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[color:var(--brand-ink)]">Zero-Knowledge Decryption</h2>
            <p className="text-[13px] text-[color:var(--muted-grey)]">
              Decrypting payload with AES-256-GCM locally inside your browser...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-4 text-center">
        <div className="glass-panel rounded-3xl p-8 shadow-sm w-full space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 shadow-2xs">
            {error === 'revoked' && <ShieldAlert className="h-7 w-7" />}
            {error === 'expired-or-missing' && <Clock className="h-7 w-7" />}
            {error === 'missing-key' && <Key className="h-7 w-7" />}
            {error === 'corrupted' && <AlertOctagon className="h-7 w-7" />}
            {error === 'network' && <WifiOff className="h-7 w-7" />}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-extrabold text-[color:var(--brand-ink)]">
              {error === 'revoked' && 'Access Revoked'}
              {error === 'expired-or-missing' && 'Share Expired or Missing'}
              {error === 'missing-key' && 'Incomplete Share Link'}
              {error === 'corrupted' && 'Decryption Failed'}
              {error === 'network' && 'Connection Error'}
            </h1>
            <p className="text-[13px] text-[color:var(--muted-grey)] leading-relaxed">
              {error === 'revoked' &&
                'The patient has explicitly revoked access to this summary. The ciphertext has been permanently purged from our servers.'}
              {error === 'expired-or-missing' &&
                'This share link has expired or the ciphertext was deleted from the server according to its time-to-live.'}
              {error === 'missing-key' &&
                'The decryption key is missing from the link URL fragment (#k=...). Please request a complete, intact link from the patient.'}
              {error === 'corrupted' &&
                'The shared data could not be decrypted. The encryption key or ciphertext payload may have been modified or corrupted.'}
              {error === 'network' &&
                'Could not retrieve the shared ciphertext from the server. Please check your network connection.'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--forest-800)] px-5 py-2.5 text-[13px] font-bold text-white shadow-xs hover:bg-[var(--forest-700)] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return Home</span>
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
        <main className="flex min-h-[70vh] flex-col items-center justify-center p-4">
          <div className="flex items-center gap-3 text-[color:var(--muted-grey)]">
            <Loader2 className="h-6 w-6 animate-spin text-[color:var(--brand-ink)]" />
            <p className="text-sm font-semibold">Loading clinical brief...</p>
          </div>
        </main>
      }
    >
      <ShareViewerContent params={params} />
    </Suspense>
  );
}
