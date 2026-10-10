'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, FileText, Share2, LayoutDashboard, Sparkles } from 'lucide-react';
import { useVault } from '@/lib/vault';
import { useIsMounted } from '@/lib/useIsMounted';

export function Navigation() {
  const pathname = usePathname();
  const mounted = useIsMounted();
  const { record } = useVault();

  // Don't render full nav on clinician share view to keep it distraction-free
  if (pathname.startsWith('/s/')) {
    return null;
  }

  const pendingCount = mounted && record?.pendingReview ? record.pendingReview.length : 0;

  const navLinks = [
    { href: '/', label: 'Overview', icon: Sparkles },
    { href: '/vault', label: 'Vault', icon: LayoutDashboard },
    {
      href: '/vault/import',
      label: 'Import',
      icon: FileText,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { href: '/vault/share', label: 'Share', icon: Share2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e2e7e0]/80 bg-[#f8f9f5]/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-0">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14382f] text-[#ddf2e8] shadow-xs group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="h-5 w-5 text-[#3eb4a4]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-[#14382f]">CareBridge</span>
              <span className="rounded bg-[#ddf2e8] px-1.5 py-0.5 text-[10px] font-semibold text-[#14382f]">Handover</span>
            </div>
            <span className="text-[10px] text-[#6e7771] tracking-wide">Patient-Controlled Continuity</span>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="order-3 flex w-full items-center justify-between gap-1 sm:order-none sm:w-auto sm:gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#14382f] text-white shadow-xs'
                    : 'text-[#505a54] hover:bg-[#e9eee7] hover:text-[#1c2420]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#3eb4a4]' : 'text-[#6e7771]'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status pill */}
        <div className="hidden md:flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d3dbcf] bg-white/70 px-2.5 py-1 text-[11px] text-[#556059] shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2e9385] animate-pulse" />
            <span className="font-medium">Client Encrypted</span>
          </div>
        </div>
      </div>
    </header>
  );
}
