import type { Metadata } from 'next';

// Share links must not leak via previews, indexing or the Referer header.
export const metadata: Metadata = {
  title: 'Shared health summary',
  description: 'Encrypted health summary shared by a patient.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
