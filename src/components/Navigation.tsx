'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, FileText, Share2, LayoutDashboard, Sparkles, Lock } from 'lucide-react';
import { useVault } from '@/lib/vault';
import { useIsMounted } from '@/lib/useIsMounted';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Navigation() {
  const pathname = usePathname();
  const mounted = useIsMounted();
  const { record } = useVault();

  // Don't render full nav on clinician share view to keep it distraction-free
  if (pathname.startsWith('/s/')) {
    return <div className="fixed right-5 top-4 z-40 print:hidden"><ThemeToggle /></div>;
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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-card)] bg-[var(--background)]/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-20 max-w-[1248px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:flex-nowrap sm:px-8 sm:py-0">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--forest-800)] text-[#e4eee5] group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="h-5 w-5 text-[#8ccab5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-semibold tracking-tight text-[color:var(--brand-ink)]">Handover</span>
              <span className="rounded bg-[var(--mint-100)] px-1.5 py-0.5 text-[12px] font-semibold text-[color:var(--brand-ink)]">Demo</span>
            </div>
            <span className="text-[12px] text-[color:var(--muted-grey)] tracking-wide">Patient-controlled continuity</span>
          </div>
        </Link>

        {/* Navigation items */}
        <nav aria-label="Main navigation" className="order-3 flex w-full items-center justify-between gap-1 sm:order-none sm:w-auto sm:gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex min-h-11 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-[var(--mint-100)] text-[color:var(--brand-ink)]'
                    : 'text-[color:var(--brand-ink)] hover:bg-[var(--surface-muted)] hover:text-[color:var(--brand-ink)]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[color:var(--teal-text)]' : 'text-[color:var(--muted-grey)]'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[12px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Appearance & local storage status */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-[var(--border-card)] bg-white/70 px-2.5 py-1 text-[12px] text-[color:var(--muted-grey)] shadow-2xs">
            <Lock className="h-3.5 w-3.5 text-[color:var(--teal-text)]" />
            <span className="font-medium">Local browser vault</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
