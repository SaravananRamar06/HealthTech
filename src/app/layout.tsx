import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8f9f5] text-[#1c2420]">
        <Suspense fallback={<div className="h-16 w-full border-b border-[#e2e7e0]/80 bg-[#f8f9f5]/85" />}>
          <Navigation />
        </Suspense>
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
