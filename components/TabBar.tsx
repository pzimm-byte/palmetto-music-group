'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Music, Plus, User } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Home', Icon: Home, match: (p: string) => p === '/' },
  { href: '/songs', label: 'Songs', Icon: Music, match: (p: string) => p.startsWith('/songs') },
  { href: '/discuss', label: 'Discuss', Icon: MessageCircle, match: (p: string) => p.startsWith('/discuss') },
  { href: '/profile', label: 'Profile', Icon: User, match: (p: string) => p.startsWith('/profile') },
];

export function TabBar() {
  const path = usePathname() ?? '/';
  const tab = (t: (typeof TABS)[number]) => (
    <Link key={t.href} href={t.href} className="tab" aria-current={t.match(path) ? 'page' : undefined}>
      <t.Icon size={22} strokeWidth={2} aria-hidden="true" />
      {t.label}
    </Link>
  );
  return (
    <nav className="tabbar" aria-label="Main">
      {tab(TABS[0])}
      {tab(TABS[1])}
      <Link href="/upload" className="tab-upload" aria-label="Upload a song">
        <Plus size={22} strokeWidth={2.2} aria-hidden="true" />
      </Link>
      {tab(TABS[2])}
      {tab(TABS[3])}
    </nav>
  );
}
