'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction, type FormState } from '@/lib/auth/actions';
import { AuthShell } from '../AuthShell';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, null);
  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we'll send you a link to set a new password.">
      {state?.message ? (
        <div className="ok-box" role="status">{state.message}</div>
      ) : (
        <form action={action} className="stack gap-16" noValidate>
          <div className="stack" style={{ gap: 6 }}>
            <label htmlFor="email" className="field-label">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" className="input" required />
          </div>
          {state?.error && <div className="error-box" role="alert">{state.error}</div>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <Link href="/sign-in" className="text-link" style={{ alignSelf: 'center' }}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}
