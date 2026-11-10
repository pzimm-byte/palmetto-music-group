'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/** Updates ?q= as you type (debounced). Also works as a plain GET form without JavaScript. */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const path = usePathname();
  const [value, setValue] = useState(initial);
  const [, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      // Read the live URL (not a render-time snapshot) so a filter tapped just before typing is kept.
      const next = new URLSearchParams(window.location.search);
      if (value.trim()) next.set('q', value.trim());
      else next.delete('q');
      start(() => router.replace(`${path}${next.size ? '?' + next.toString() : ''}`, { scroll: false }));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form role="search" action={path} onSubmit={(e) => e.preventDefault()}>
      <label className="search">
        <Search size={18} strokeWidth={2} aria-hidden="true" />
        <span className="sr-only">Search songs</span>
        <input type="search" name="q" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search by title, writer or lyric" autoComplete="off" />
      </label>
    </form>
  );
}
