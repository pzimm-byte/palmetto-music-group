import Link from 'next/link';
import { Suspense } from 'react';
import { countByStatus, librarySongs, writers } from '@/lib/data/queries';
import { STATUS_LABEL, STATUS_ORDER, isStatus, type SongStatus } from '@/lib/format';
import { SongRowCard } from '@/components/bits';
import { SearchBox } from '@/components/SearchBox';

export const metadata = { title: 'Songs' };

type SP = Promise<{ q?: string; status?: string; writer?: string; writers?: string }>;

function href(base: { q?: string; status?: string; writer?: string; writers?: string }, change: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  const merged = { ...base, ...change };
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return `/songs${s ? '?' + s : ''}`;
}

export default async function LibraryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').slice(0, 100);
  const status: SongStatus | undefined = isStatus(sp.status) ? sp.status : undefined;
  const writerId = sp.writer;
  const [all, writerList] = await Promise.all([librarySongs({ q, writer: writerId }), writers()]);
  const counts = countByStatus(all);
  const songs = status ? all.filter((s) => s.status === status) : all;
  const activeWriter = writerList.find((w) => w.id === writerId);
  const base = { q: q || undefined, status, writer: writerId };
  const showWriters = sp.writers === '1';

  return (
    <div className="screen">
      <header className="stack gap-12" style={{ padding: '20px 0 8px' }}>
        <h1 className="screen-title-xl">Songs</h1>
        <Suspense>
          <SearchBox initial={q} />
        </Suspense>
        <nav className="pills" aria-label="Filter by status">
          <Link href={href(base, { status: undefined })} className="pill" aria-current={!status ? 'true' : undefined}>
            All · {counts.all}
          </Link>
          {STATUS_ORDER.map((s) => (
            <Link key={s} href={href(base, { status: s })} className="pill" aria-current={status === s ? 'true' : undefined}>
              {STATUS_LABEL[s]} · {counts[s]}
            </Link>
          ))}
        </nav>
        <div className="row between meta" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span>
            Newest first
            {activeWriter && (
              <>
                {' · '}by {activeWriter.first_name} {activeWriter.last_name}
              </>
            )}
          </span>
          {activeWriter ? (
            <Link href={href(base, { writer: undefined })} className="text-link" style={{ fontWeight: 500, fontSize: 13 }}>
              Clear writer
            </Link>
          ) : (
            <Link
              href={href(base, { writers: showWriters ? undefined : '1' })}
              className="text-link"
              style={{ fontWeight: 500, fontSize: 13 }}
              aria-expanded={showWriters}
            >
              Filter by writer
            </Link>
          )}
        </div>
        {showWriters && !activeWriter && (
          <nav className="pills" aria-label="Writers" style={{ flexWrap: 'wrap' }}>
            {writerList.map((w) => (
              <Link key={w.id} href={href(base, { writer: w.id, writers: undefined })} className="pill">
                {w.first_name} {w.last_name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main style={{ paddingTop: 4 }}>
        {songs.length === 0 ? (
          <p className="card card-14 pad-16 meta" role="status">
            No songs match{q ? ` “${q}”` : ''}. Try a different search or filter.
          </p>
        ) : (
          <ul className="stack gap-10" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {songs.map((s, i) => (
              <li key={s.id}>
                <SongRowCard song={s} index={i} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
