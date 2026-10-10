'use client';

import { useEffect, useRef } from 'react';

/** Focus stays inside the existing dialog; its original close handler is preserved. */
export function DialogFocus({ onClose }: { onClose: () => void }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const close = useRef(onClose);

  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = anchor.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]'))
      .filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0 && element.getClientRects().length > 0);
    const focusFirst = () => (controls()[0] ?? dialog).focus();
    const isTopDialog = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
      .filter((element) => element.getClientRects().length > 0).at(-1) === dialog;
    focusFirst();
    const handleKey = (event: KeyboardEvent) => {
      if (!isTopDialog()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const elements = controls();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    const containFocus = (event: FocusEvent) => { if (isTopDialog() && !dialog.contains(event.target as Node)) focusFirst(); };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', containFocus);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return <span ref={anchor} hidden />;
}
