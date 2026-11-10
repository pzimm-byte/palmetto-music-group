import { expect, test } from '@playwright/test';
import { PASSWORD, USERS, db, expectNoHorizontalScroll, expectTouchTargets, signIn } from './helpers';

test.describe('signed-out visitor', () => {
  for (const path of ['/', '/songs', '/songs/64340c95-eccd-4fc8-9d77-c7f4068166d0', '/upload', '/profile']) {
    test(`is sent to Sign in from ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in/);
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    });
  }

  test('there is no sign-up page or sign-up API', async ({ page, request }) => {
    const r = await page.goto('/sign-up');
    await expect(page).toHaveURL(/\/sign-in/); // protected route → sign in, never a sign-up form
    expect(r?.status()).toBeLessThan(500);
    await expect(page.getByText(/create (an )?account/i)).toHaveCount(0);
    const api = await request.post('/api/auth/sign-up/email', { data: { email: 'x@y.z', password: 'whatever123', name: 'X' } });
    expect(api.status()).toBe(404);
  });

  test('sign-in screen meets touch-target and layout rules', async ({ page }) => {
    await page.goto('/sign-in');
    await expectTouchTargets(page);
    await expectNoHorizontalScroll(page);
  });
});

test.describe('sign in', () => {
  test('wrong password shows an error and stays on Sign in', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(USERS.marcus);
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.error-box')).toContainText("don't match an account");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('unknown email gets the same error (no account probing)', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill('stranger@example.com');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.error-box')).toContainText("don't match an account");
  });

  test('empty form asks for details', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.error-box')).toContainText('Enter your email and password');
  });

  test('an inactive member cannot sign in even with the right password', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(USERS.emily);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.error-box')).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('a seeded member signs in, lands on Home, and can sign out', async ({ page }) => {
    await signIn(page, USERS.marcus);
    await expect(page.getByText(/Good (morning|afternoon|evening), Marcus/)).toBeVisible();
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto('/songs');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('returns to the page you asked for', async ({ page }) => {
    await page.goto('/songs?status=draft');
    await expect(page).toHaveURL(/next=/);
    await page.getByLabel('Email').fill(USERS.marcus);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/songs\?status=draft/);
  });
});

test.describe('forgot password', () => {
  test('always shows the same message and a reset link sets a new password', async ({ page }, info) => {
    await page.goto('/sign-in');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
    await expectTouchTargets(page);

    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.locator('.ok-box')).toContainText("If that email belongs to a member");

    // Real reset for a throwaway seeded member, then restore the password.
    const who = info.project.name.includes('laptop') ? 'hannah.okafor@pbc-songwriters.test' : 'david.harper@pbc-songwriters.test';
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(who);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.locator('.ok-box')).toBeVisible();
    const [v] = await db<{ identifier: string }>(
      `select identifier from neon_auth.verification v join neon_auth."user" u on u.id::text = v.value where u.email = $1 order by v."createdAt" desc limit 1`,
      [who],
    );
    const token = v.identifier.replace('reset-password:', '');

    await page.goto(`/reset-password?token=${token}`);
    await page.getByLabel('New password', { exact: true }).fill('short');
    await page.getByLabel('Confirm new password').fill('short');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.locator('.error-box')).toContainText('at least 8');

    await page.getByLabel('New password', { exact: true }).fill('brand-new-pass-1');
    await page.getByLabel('Confirm new password').fill('brand-new-pass-1');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page).toHaveURL(/\/sign-in\?reset=1/);
    await expect(page.locator('.ok-box')).toContainText('password was changed');
    await signIn(page, who, 'brand-new-pass-1');

    // used link cannot be reused
    await page.context().clearCookies();
    await page.goto(`/reset-password?token=${token}`);
    await page.getByLabel('New password', { exact: true }).fill('another-pass-22');
    await page.getByLabel('Confirm new password').fill('another-pass-22');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.locator('.error-box')).toContainText('expired or was already used');

    // restore seed password for later tests
    const { hashPassword } = await import('better-auth/crypto');
    await db(`update neon_auth.account a set password = $1 from neon_auth."user" u where a."userId" = u.id and u.email = $2`, [await hashPassword(PASSWORD), who]);
  });

  test('reset page without a code explains what to do', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.locator('.error-box')).toContainText('missing its code');
  });
});
