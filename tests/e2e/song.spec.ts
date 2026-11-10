import { expect, test, type Page } from '@playwright/test';
import { USERS, db, expectNoHorizontalScroll, expectTouchTargets, signIn, songId } from './helpers';

const pos = (page: Page) => page.getByTestId('position');

async function open(page: Page, title: string, v?: number) {
  await page.goto(`/songs/${await songId(title)}${v ? `?v=${v}` : ''}`);
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
}

test.describe('Song page — member view', () => {
  test.beforeEach(async ({ page }) => signIn(page, USERS.marcus));

  test('layout top to bottom matches the spec', async ({ page }) => {
    await open(page, 'Grace Upon Grace');
    await expect(page.getByRole('link', { name: 'Back to songs' })).toBeVisible();
    await expect(page.locator('.tag').first()).toHaveText('In review');
    await expect(page.getByText('Key of G · 72 BPM')).toBeVisible();
    await expect(page.getByText(/by Sarah Mitchell · uploaded/)).toBeVisible();

    // order: versions → ask card → player → feedback form → rate → averages → tabs
    const y = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y;
    const order = [await y('[data-testid=versions]'), await y('.ask-card'), await y('[aria-label=Player]'), await y('form[aria-label="Your feedback"]'), await y('[aria-labelledby=rate]'), await y('[aria-label="Average ratings"]'), await y('[role=tablist]')];
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    await expect(page.getByRole('heading', { name: 'What Sarah wants feedback on' })).toBeVisible();
    await expect(page.getByPlaceholder('Write your feedback')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rate v2' })).toBeVisible();
    await expect(page.getByTestId('writer-card')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /Feedback on v2 \(\d+\)/ })).toHaveAttribute('aria-selected', 'true');
    await expectTouchTargets(page);
    await expectNoHorizontalScroll(page);
  });

  test('play/pause moves the playhead; skip ±10 s; tapping a timestamp or dot jumps', async ({ page }) => {
    await open(page, 'Grace Upon Grace');
    await expect(pos(page)).toHaveText('0:00');
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(pos(page)).not.toHaveText('0:00', { timeout: 3000 });
    await page.getByRole('button', { name: 'Pause' }).click();
    const paused = await pos(page).textContent();
    await page.waitForTimeout(1200);
    await expect(pos(page)).toHaveText(paused!);

    await page.getByRole('button', { name: '1:42', exact: false }).filter({ hasText: '1:42' }).first().click();
    await expect(pos(page)).toHaveText('1:42');
    await page.getByRole('button', { name: 'Forward 10 seconds' }).click();
    await expect(pos(page)).toHaveText('1:52');
    await page.getByRole('button', { name: 'Back 10 seconds' }).click();
    await page.getByRole('button', { name: 'Back 10 seconds' }).click();
    await expect(pos(page)).toHaveText('1:32');
    await page.getByRole('button', { name: 'Jump to comment at 0:58' }).click();
    await expect(pos(page)).toHaveText('0:58');

    // tapping the waveform seeks
    const wave = page.getByTestId('waveform');
    const box = (await wave.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    await expect(pos(page)).toHaveText(/^2:0\d$/);
    // played bars are drawn in brand green
    await expect(page.locator('.wave-bar.played').first()).toHaveCSS('background-color', 'rgb(118, 188, 33)');
  });

  test('version switching: latest on the right, older version shows a note and its own feedback', async ({ page }) => {
    await open(page, 'Grace Upon Grace');
    const pills = page.getByTestId('versions').getByRole('link');
    await expect(pills).toHaveText(['v1', 'v2 · latest']);
    await expect(pills.last()).toHaveAttribute('aria-current', 'true');
    await pills.first().click();
    await expect(page).toHaveURL(/\?v=1/);
    await expect(page.getByText(/Playing v1 from .+\. The latest version is v2\./)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Feedback on v1 (4)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rate v1' })).toBeVisible();
    await expect(page.getByText('The ending feels abrupt')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jump to comment at 3:37' })).toBeVisible();
    await page.getByTestId('versions').getByRole('link', { name: 'v2 · latest' }).click();
    await expect(page.getByText(/Playing v1/)).toHaveCount(0);
  });

  test('20+ versions overflow by horizontal scroll and open scrolled to the right', async ({ page }) => {
    await open(page, 'Come, Weary Ones');
    const strip = page.getByTestId('versions');
    await expect(strip.getByRole('link')).toHaveCount(22);
    const s = await strip.evaluate((el) => ({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth }));
    if (s.max > 0) expect(s.left).toBeGreaterThanOrEqual(s.max - 2);
    await expect(strip.getByRole('link', { name: 'v22 · latest' })).toBeInViewport();
    await expectNoHorizontalScroll(page);
  });

  test('30+ comments are paged with "Show more"', async ({ page }) => {
    await open(page, 'Come, Weary Ones');
    await expect(page.getByRole('tab', { name: /Feedback on v22 \(3\d\)/ })).toBeVisible();
    await expect(page.getByTestId('comment')).toHaveCount(20);
    await page.getByRole('button', { name: /Show more feedback/ }).click();
    expect(await page.getByTestId('comment').count()).toBeGreaterThanOrEqual(30);
  });

  test('a version with 0 comments shows an empty state', async ({ page }) => {
    await open(page, 'Still the Lamb');
    await expect(page.getByRole('tab', { name: 'Feedback on v3 (0)' })).toBeVisible();
    await expect(page.getByTestId('no-comments')).toContainText('No feedback on this version yet');
    await expect(page.locator('.marker')).toHaveCount(0);
  });

  test('pin follows the playhead, drags live, and can be turned off', async ({ page }) => {
    await open(page, 'Morning Mercies');
    await expect(page.getByTestId('pin-label')).toHaveText('Pinned at 0:00 · drag to move');
    await page.getByRole('button', { name: 'Forward 10 seconds' }).click();
    await expect(page.getByTestId('pin-label')).toHaveText('Pinned at 0:10 · drag to move');
    const markerLeft = () => page.getByTestId('pin-marker').evaluate((el) => (el as HTMLElement).style.left);
    const before = await markerLeft();
    await page.getByLabel(/Pinned at/).fill('102');
    await expect(page.getByTestId('pin-label')).toHaveText('Pinned at 1:42 · drag to move');
    expect(await markerLeft()).not.toBe(before);
    // after dragging, the pin no longer follows the playhead
    await page.getByRole('button', { name: 'Forward 10 seconds' }).click();
    await expect(page.getByTestId('pin-label')).toHaveText('Pinned at 1:42 · drag to move');
    await page.getByRole('button', { name: 'Unpin this feedback' }).click();
    await expect(page.getByTestId('pin-label')).toHaveText('Not pinned · tap the pin to add one');
    await expect(page.getByTestId('pin-marker')).toHaveCount(0);
    await page.getByRole('button', { name: 'Pin this feedback to a moment' }).click();
    await expect(page.getByTestId('pin-marker')).toHaveCount(1);
  });

  test('posting saves the member name, pinned time and version — and unpinned posts apply to the whole song', async ({ page }, info) => {
    await open(page, 'Morning Mercies');
    const text = `Pinned note from ${info.project.name} ${Date.now()}`;
    await page.getByLabel(/Pinned at/).fill('75');
    await page.getByPlaceholder('Write your feedback').fill(text);
    await page.getByRole('button', { name: 'Post feedback' }).click();
    await expect(page.getByText('Posted at 1:15. Thanks for the feedback!')).toBeVisible();
    await expect(page.getByPlaceholder('Write your feedback')).toHaveValue('');
    await expect(page.getByTestId('comment').filter({ hasText: text })).toContainText('Marcus Bell');
    await expect(page.getByTestId('comment').filter({ hasText: text }).getByRole('button', { name: 'Jump to 1:15' })).toBeVisible();

    const [saved] = await db<{ first_name: string; timestamp_seconds: number; version_number: number }>(
      `select m.first_name, c.timestamp_seconds, v.version_number from comments c join members m on m.id = c.author_id
         join song_versions v on v.id = c.version_id where c.body = $1`,
      [text],
    );
    expect(saved).toEqual({ first_name: 'Marcus', timestamp_seconds: 75, version_number: 1 });

    const whole = `Whole-song note ${info.project.name} ${Date.now()}`;
    await page.getByRole('button', { name: 'Unpin this feedback' }).click();
    await page.getByPlaceholder('Write your feedback').fill(whole);
    await page.getByRole('button', { name: 'Post feedback' }).click();
    await expect(page.getByText('Posted for the whole song. Thanks for the feedback!')).toBeVisible();
    const [w] = await db<{ timestamp_seconds: number | null; author_id: string | null }>('select timestamp_seconds, author_id from comments where body = $1', [whole]);
    expect(w.timestamp_seconds).toBeNull();
    expect(w.author_id).not.toBeNull();
  });

  test('empty feedback is rejected; long feedback wraps without sideways scroll', async ({ page }) => {
    await open(page, 'Morning Mercies');
    await page.getByRole('button', { name: 'Post feedback' }).click();
    await expect(page.locator('.error-box')).toContainText('Write some feedback first');
    await open(page, "Hymn of the Long Night (A Lament That Ends in Hope at the River's Edge)");
    await expect(page.getByText(/I have listened to this four or five times/)).toBeVisible();
    await expect(page.getByText('Jonathan Alexander Montgomery-Whitfield').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('reply opens inline, writer replies are labelled, thumbs-up toggles', async ({ page }, info) => {
    await open(page, 'Grace Upon Grace');
    const david = page.getByTestId('comment').filter({ hasText: 'The bridge drags here' });
    await expect(david.getByTestId('reply').filter({ hasText: 'Sarah Mitchell' })).toContainText('· writer');

    const like = david.getByRole('button', { name: /Thumbs up, \d+/ });
    const n = Number((await like.getAttribute('aria-label'))!.match(/\d+/)![0]);
    const wasLiked = (await like.getAttribute('aria-pressed')) === 'true';
    const after = wasLiked ? n - 1 : n + 1;
    await like.click();
    await expect(david.getByRole('button', { name: `Thumbs up, ${after}` })).toHaveAttribute('aria-pressed', String(!wasLiked));
    await page.reload(); // persisted
    const again = page.getByTestId('comment').filter({ hasText: 'The bridge drags here' }).getByRole('button', { name: `Thumbs up, ${after}` });
    await expect(again).toHaveAttribute('aria-pressed', String(!wasLiked));
    await again.click(); // toggle back
    await expect(page.getByTestId('comment').filter({ hasText: 'The bridge drags here' }).getByRole('button', { name: `Thumbs up, ${n}` })).toHaveAttribute('aria-pressed', String(wasLiked));

    const reply = `Reply from ${info.project.name} ${Date.now()}`;
    const card = page.getByTestId('comment').filter({ hasText: 'The bridge drags here' });
    await card.getByRole('button', { name: 'Reply' }).click();
    await card.getByPlaceholder('Reply to David').fill(reply);
    await card.getByRole('button', { name: 'Send reply' }).click();
    await expect(card.getByTestId('reply').filter({ hasText: reply })).toContainText('Marcus Bell');
  });

  test('ratings save automatically and average tiles update', async ({ page }) => {
    await open(page, 'Morning Mercies');
    await page.getByRole('button', { name: 'Melody, 4 out of 5' }).click();
    await page.getByRole('button', { name: 'Theology, 5 out of 5' }).click();
    await expect(page.getByRole('button', { name: 'Melody, 4 out of 5' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Melody, 5 out of 5' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Melody, 4 out of 5' })).toHaveCSS('color', 'rgb(26, 26, 26)'); // #1A1A1A on brand green
    await expect.poll(async () => (await db<{ melody: number }>("select melody from ratings r join members m on m.id = r.member_id where m.first_name = 'Marcus' and r.version_id in (select v.id from song_versions v join songs s on s.id = v.song_id where s.title = 'Morning Mercies')"))[0]?.melody).toBe(4);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Melody, 4 out of 5' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Average ratings' })).toContainText('Melody avg');
  });

  test('Lyrics and Chord chart tabs', async ({ page }) => {
    await open(page, 'Grace Upon Grace');
    await page.getByRole('tab', { name: 'Lyrics' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('Grace upon grace, like a river flowing');
    await page.getByRole('tab', { name: 'Chord chart' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('grace-upon-grace-chart.pdf');
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('next phase');
    await open(page, 'Morning Mercies');
    await page.getByRole('tab', { name: 'Chord chart' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('No chord chart attached yet');
  });

  test('an unknown song id shows Not found', async ({ page }) => {
    await page.goto('/songs/00000000-0000-0000-0000-000000000000');
    await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible();
    await page.goto('/songs/not-a-uuid');
    await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible();
  });
});

test.describe('Song page — writer view', () => {
  test('writers see writer tools on their own songs only', async ({ page }) => {
    await signIn(page, USERS.paul);
    await open(page, 'Every Promise');
    const card = page.getByTestId('writer-card');
    await expect(card).toContainText('Your song');
    await expect(card).toContainText(/new comments? on v1 this week|No new comments/);
    await expect(card.getByRole('link', { name: 'Upload v2' })).toBeVisible();
    await expect(page.getByPlaceholder('Write your feedback')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Rate v/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'You asked listeners about' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Average ratings' })).toBeVisible();
    // same writer card row: Upload on the left, Mark complete on the right
    const up = (await card.getByRole('link', { name: 'Upload v2' }).boundingBox())!;
    const mc = (await card.getByRole('button', { name: 'Mark complete' }).boundingBox())!;
    expect(up.x).toBeLessThan(mc.x);
    expect(Math.abs(up.y - mc.y)).toBeLessThan(4);
    await expectTouchTargets(page);
    await expectNoHorizontalScroll(page);

    await open(page, 'Grace Upon Grace'); // not Paul's song
    await expect(page.getByTestId('writer-card')).toHaveCount(0);
    await expect(page.getByPlaceholder('Write your feedback')).toBeVisible();
  });

  test('Mark complete and Reopen change the status', async ({ page }) => {
    await signIn(page, USERS.paul);
    await open(page, 'Every Promise');
    await page.getByRole('button', { name: 'Mark complete' }).click();
    await expect(page.locator('.tag').first()).toHaveText('Review complete');
    await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible();
    expect((await db<{ status: string }>("select status from songs where title = 'Every Promise'"))[0].status).toBe('review_complete');
    await page.getByRole('button', { name: 'Reopen' }).click();
    await expect(page.locator('.tag').first()).toHaveText('In review');
  });

  test('Upload vN opens the upload form in New version mode for this song', async ({ page }) => {
    await signIn(page, USERS.paul);
    await open(page, 'Come, Weary Ones');
    await page.getByRole('link', { name: 'Upload v23' }).click();
    await expect(page.getByRole('heading', { name: 'New version' })).toBeVisible();
    await expect(page.getByLabel('Which song?')).toHaveValue(await songId('Come, Weary Ones'));
    await expect(page.getByText('This will be v23.')).toBeVisible();
  });
});
