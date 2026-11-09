export function ComingSoon({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="screen">
      <header style={{ padding: '20px 0 12px' }}>
        <h1 className="screen-title-xl">{title}</h1>
      </header>
      <main className="stack gap-16">
        <p className="card card-16 pad-16" style={{ color: 'var(--text2)' }}>
          {title} is coming in a later update. For now, share feedback on songs from the Songs tab.
        </p>
        {children}
      </main>
    </div>
  );
}
