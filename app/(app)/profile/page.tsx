import { requireMember } from '@/lib/auth/session';
import { signOutAction } from '@/lib/auth/actions';
import { ComingSoon } from '@/components/ComingSoon';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const me = await requireMember();
  return (
    <ComingSoon title="Profile">
      <section className="card card-16 pad-16 stack gap-12">
        <div>
          <div className="break" style={{ fontWeight: 600 }}>
            {me.first_name} {me.last_name}
          </div>
          <div className="meta break">{me.email}</div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-outline">Sign out</button>
        </form>
      </section>
    </ComingSoon>
  );
}
