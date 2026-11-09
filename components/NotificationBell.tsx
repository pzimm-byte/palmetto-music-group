'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

/** Notifications arrive in a later phase; the bell explains that instead of doing nothing. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn icon-btn-outline" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div className="popover" role="status">
          <b>You&apos;re all caught up.</b>
          <p className="meta" style={{ marginTop: 4 }}>Notifications are coming in a later update.</p>
        </div>
      )}
    </div>
  );
}
