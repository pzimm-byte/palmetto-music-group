export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <main className="auth-card">
        <div>
          <div className="eyebrow">Palmetto Baptist Church</div>
          <div className="screen-title">Songwriters</div>
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h1>
          {subtitle && <p className="meta">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
