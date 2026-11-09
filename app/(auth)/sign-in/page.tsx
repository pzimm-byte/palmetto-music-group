import { redirect } from 'next/navigation';
import { currentMember } from '@/lib/auth/session';
import { AuthShell } from '../AuthShell';
import { SignInForm } from './SignInForm';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  if (await currentMember()) redirect('/');
  const sp = await searchParams;
  return (
    <AuthShell title="Sign in" subtitle="Accounts are created by the group admin. There is no public sign-up.">
      {sp.reset === '1' && <div className="ok-box" role="status">Your password was changed. Sign in with the new one.</div>}
      <SignInForm next={sp.next ?? '/'} />
    </AuthShell>
  );
}
