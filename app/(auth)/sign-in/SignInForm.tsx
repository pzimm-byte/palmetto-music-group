'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signInAction, type FormState } from '@/lib/auth/actions';

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, null);
  return (
    <form action={action} className="stack gap-16" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="stack" style={{ gap: 6 }}>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" className="input" required />
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
      </div>
      {state?.error && <div className="error-box" role="alert">{state.error}</div>}
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      <Link href="/forgot-password" className="text-link" style={{ alignSelf: 'center' }}>
        Forgot password?
      </Link>
    </form>
  );
}
