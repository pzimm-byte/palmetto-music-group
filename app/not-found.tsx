import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
        <h1 className="screen-title">Not found</h1>
        <p className="meta">That page or song doesn&apos;t exist, or it was removed.</p>
        <Link href="/songs" className="btn btn-primary">Go to Songs</Link>
      </div>
    </div>
  );
}
