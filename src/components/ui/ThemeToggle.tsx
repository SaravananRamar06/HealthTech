'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const subscribe = (listener: () => void) => {
  window.addEventListener('handover-theme', listener);
  return () => window.removeEventListener('handover-theme', listener);
};
const getTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
const getServerTheme = () => 'light';

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('handover-appearance', next); } catch { /* Theme still works when browser storage is unavailable. */ }
    window.dispatchEvent(new Event('handover-theme'));
  };

  return (
    <button type="button" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} className="theme-toggle inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--surface)] text-[color:var(--brand-ink)] transition-colors">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
