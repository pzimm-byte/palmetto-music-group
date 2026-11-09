'use client';

import Link from 'next/link';
import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPasswordAction, type FormState } from '@/lib/auth/actions';
import { AuthShell } from '../AuthShell';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, null);
  if (!token) {
    return (
      <>
        <div className="error-box" role="alert">This reset link is missing its code. Request a new link.</div>
        <Link href="/forgot-password" className="btn btn-primary">Request a new link</Link>
      </>
    );
  }
  return (
    <form action={action} className="stack gap-16" noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="stack" style={{ gap: 6 }}>
        <label htmlFor="password" className="field-label">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} className="input" required aria-describedby="pw-help" />
        <span id="pw-help" className="helper">At least 8 characters.</span>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <label htmlFor="confirm" className="field-label">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" required />
      </div>
      {state?.error && <div className="error-box" role="alert">{state.error}</div>}
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password">
      <Suspense>
        <ResetForm />
      </Suspense>
      <Link href="/sign-in" className="text-link" style={{ alignSelf: 'center' }}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}
