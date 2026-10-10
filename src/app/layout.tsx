import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareBridge Handover — Provenance-Backed Clinical Health Brief",
  description: "Turn scattered prescriptions, reports and WhatsApp photos into an encrypted one-screen brief your next doctor can trust.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try { const saved = localStorage.getItem('handover-appearance'); document.documentElement.dataset.theme = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; } catch { document.documentElement.dataset.theme = 'light'; }` }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          <Suspense fallback={<div className="h-20 w-full border-b border-[var(--border-card)] bg-background" />}>
            <Navigation />
          </Suspense>
          <div className="flex-1 flex flex-col">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
