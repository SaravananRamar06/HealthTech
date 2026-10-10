'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container floating at bottom right */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all duration-300 animate-slide-up text-xs font-medium ${
              t.type === 'success'
                ? 'border-[var(--border-strong)] bg-[var(--surface-muted)]/95 text-[color:var(--brand-ink)]'
                : t.type === 'error'
                ? 'border-rose-200 bg-rose-50/95 text-rose-950'
                : 'border-[var(--border-card)] bg-white/95 text-[color:var(--brand-ink)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-[color:var(--teal-text)] shrink-0" />}
              {t.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
              {t.type === 'info' && <Info className="h-4 w-4 text-[color:var(--teal-text)] shrink-0" />}
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-[color:var(--muted-grey)] hover:text-[color:var(--brand-ink)] transition-colors p-0.5 rounded-md hover:bg-black/5"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider to avoid throwing in unit tests
    return {
      showToast: (msg: string) => console.log('[Toast fallback]:', msg),
    };
  }
  return context;
}
