import { expect, test } from '@playwright/test';
import { USERS, db, expectNoHorizontalScroll, expectTouchTargets, signIn } from './helpers';

test.describe('Home', () => {
  test('shows header, pinned announcement, songs needing feedback and recent activity', async ({ page }) => {
    await signIn(page, USERS.paul);
    await expect(page.getByText('Palmetto Baptist Church', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Songwriters' })).toBeVisible();
    await expect(page.getByText(/Good (morning|afternoon|evening), Paul/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();

    const ann = page.getByRole('region', { name: 'Pinned announcement' });
    await expect(ann.getByRole('heading', { name: 'Writing night' })).toBeVisible();
    await expect(ann.getByText('THU')).toBeVisible();
    await expect(ann.getByText('7 PM')).toBeVisible();
    await expect(ann.getByRole('link', { name: /See all announcements/ })).toBeVisible();

    const rows = page.getByTestId('feedback-row');
    await expect(rows.first()).toBeVisible();
    // Paul's own songs never appear in his "needs your feedback" list
    await expect(rows.filter({ hasText: 'Every Promise' })).toHaveCount(0);
    await expect(rows.filter({ hasText: 'Grace Upon Grace' })).toContainText(/Sarah Mitchell · v2 · \d+ comments/);
    await expect(rows.first()).toContainText('In review');

    const activity = page.getByRole('region', { name: 'Recent activity' });
    await expect(activity.getByRole('listitem').first()).toBeVisible();
    await expectTouchTargets(page);
    await expectNoHorizontalScroll(page);
  });

  test('anonymous activity uses a neutral avatar and links work', async ({ page }) => {
    await signIn(page, USERS.marcus);
    const anon = page.getByRole('listitem').filter({ hasText: 'Anonymous' }).first();
    if (await anon.count()) await expect(anon.locator('.tone-anon')).toBeVisible();
    await page.getByTestId('feedback-row').filter({ hasText: 'Grace Upon Grace' }).click();
    await expect(page.getByRole('heading', { name: 'Grace Upon Grace' })).toBeVisible();
    await page.goto('/');
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByText("You're all caught up.")).toBeVisible();
    await page.getByRole('link', { name: 'See all', exact: true }).click();
    await expect(page).toHaveURL(/status=in_review/);
  });

  test('tab bar navigates and marks the active tab', async ({ page }) => {
    await signIn(page, USERS.marcus);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Songs' }).click();
    await expect(page.getByRole('heading', { name: 'Songs' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Songs' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Discuss' }).click();
    await expect(page.getByText('Discuss is coming in a later update')).toBeVisible();
    await expectTouchTargets(page);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Upload a song' }).click();
    await expect(page.getByRole('heading', { name: 'New song' })).toBeVisible();
  });
});

test.describe('Song library', () => {
  test('lists every song newest first with counts that match the database', async ({ page }) => {
    await signIn(page, USERS.marcus);
    await page.goto('/songs');
    const counts = await db<{ status: string; n: number }>('select status, count(*)::int as n from songs group by status');
    const total = counts.reduce((a, c) => a + c.n, 0);
    const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
    const pills = page.getByRole('navigation', { name: 'Filter by status' });
    await expect(pills.getByRole('link', { name: `All · ${total}` })).toHaveAttribute('aria-current', 'true');
    await expect(pills.getByRole('link', { name: `In review · ${n('in_review')}` })).toBeVisible();
    await expect(pills.getByRole('link', { name: `Review complete · ${n('review_complete')}` })).toBeVisible();
    await expect(pills.getByRole('link', { name: `Draft · ${n('draft')}` })).toBeVisible();
    await expect(pills.getByRole('link', { name: `Archived · ${n('archived')}` })).toBeVisible();
    await expect(page.getByTestId('song-row')).toHaveCount(total);

    const newest = await db<{ title: string }>('select title from songs order by created_at desc limit 1');
    await expect(page.getByTestId('song-row').first()).toContainText(newest[0].title);
    await expect(page.getByTestId('song-row').filter({ hasText: 'Come, Weary Ones' })).toContainText('v22');
    await expectTouchTargets(page);
    await expectNoHorizontalScroll(page);
  });

  test('status filter, search by title / writer / lyric, writer filter and empty state', async ({ page }) => {
    await signIn(page, USERS.marcus);
    await page.goto('/songs');
    await page.getByRole('link', { name: /^Archived ·/ }).click();
    await expect(page).toHaveURL(/status=archived/);
    await expect(page.getByTestId('song-row')).toHaveCount(2);
    await expect(page.getByTestId('song-row').first()).toContainText('Archived');
    await page.getByRole('link', { name: /^All ·/ }).click();

    const search = page.getByRole('searchbox', { name: 'Search songs' });
    await search.fill('grace upon');
    await expect(page.getByTestId('song-row')).toHaveCount(1);
    await expect(page.getByTestId('song-row')).toContainText('Grace Upon Grace');
    await search.fill('Montgomery');
    await expect(page.getByTestId('song-row').first()).toContainText('Jonathan Alexander Montgomery');
    await search.fill('watchmen weary'); // a lyric
    await expect(page.getByTestId('song-row')).toHaveCount(1);
    await expect(page.getByTestId('song-row')).toContainText('Hymn of the Long Night');
    await search.fill('zzz no such song');
    await expect(page.getByRole('status')).toContainText('No songs match');
    await search.fill('');
    await expect(page.getByTestId('song-row').first()).toBeVisible();

    await page.getByRole('link', { name: 'Filter by writer' }).click();
    await page.getByRole('navigation', { name: 'Writers' }).getByRole('link', { name: 'Rachel Lin' }).click();
    await expect(page.getByText('by Rachel Lin')).toBeVisible();
    const rachel = await db<{ n: number }>("select count(*)::int as n from songs s join members m on m.id = s.writer_id where m.last_name = 'Lin'");
    await expect(page.getByTestId('song-row')).toHaveCount(rachel[0].n);
    await page.getByRole('link', { name: 'Clear writer' }).click();
    await expect(page.getByText('by Rachel Lin')).toHaveCount(0);
  });
});
