import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { USERS, signIn, songId } from './helpers';

/** WCAG 2 AA (incl. 4.5:1 text contrast) on every screen, in this project's colour scheme. */
async function audit(page: import('@playwright/test').Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const issues = r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join(' | ')}`);
  expect(issues).toEqual([]);
}

test('Sign in, Forgot password', async ({ page }) => {
  await page.goto('/sign-in');
  await audit(page);
  await page.goto('/forgot-password');
  await audit(page);
});

test('Home, Song library, Upload', async ({ page }) => {
  await signIn(page, USERS.marcus);
  await audit(page);
  await page.goto('/songs');
  await audit(page);
  await page.goto('/upload');
  await audit(page);
});

test('Song page member view, all tabs', async ({ page }) => {
  await signIn(page, USERS.marcus);
  await page.goto(`/songs/${await songId('Grace Upon Grace')}`);
  await audit(page);
  await page.getByRole('tab', { name: 'Lyrics' }).click();
  await audit(page);
  await page.getByRole('tab', { name: 'Chord chart' }).click();
  await audit(page);
  await page.goto(`/songs/${await songId('Grace Upon Grace')}?v=1`);
  await audit(page);
});

test('Song page writer view', async ({ page }) => {
  await signIn(page, USERS.paul);
  await page.goto(`/songs/${await songId('Every Promise')}`);
  await audit(page);
});
