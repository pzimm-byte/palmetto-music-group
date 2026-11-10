import { expect, test } from '@playwright/test';
import { USERS, db, expectNoHorizontalScroll, expectTouchTargets, signIn, songId, wav } from './helpers';

test.describe('Upload song', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, USERS.sarah);
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: 'New song' })).toBeVisible();
  });

  test('fields are in the specified order and the screen has no tab bar', async ({ page }) => {
    const labels = ['Song title', 'Key', 'Tempo (BPM)', 'Lyrics', 'Feedback focus', 'Chord chart (optional)', 'Status'];
    const ys: number[] = [];
    for (const l of labels) ys.push((await page.getByText(l, { exact: true }).first().boundingBox())!.y);
    expect(ys[1]).toBeCloseTo(ys[2], 0); // Key + Tempo side by side
    const vertical = [ys[0], ys[1], ys[3], ys[4], ys[5], ys[6]];
    expect([...vertical].sort((a, b) => a - b)).toEqual(vertical);
    await expect(page.getByPlaceholder('What feedback are you looking for?')).toBeVisible();
    await expect(page.getByText('Shown above the player so listeners know what to listen for.')).toBeVisible();
    await expect(page.getByText('MP3 or M4A recommended, up to 100 MB.', { exact: false })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    const share = (await page.getByRole('button', { name: 'Share song' }).boundingBox())!;
    const vw = page.viewportSize()!.width;
    expect(share.width).toBeLessThan(vw - 32); // centered, not full width
    expect(Math.abs(share.x + share.width / 2 - vw / 2)).toBeLessThan(vw > 800 ? 400 : 4);
    await expectTouchTargets(page);
    await expectNoHorizontalScroll(page);
  });

  test('validates before sharing: no file, no title, wrong file type', async ({ page }) => {
    await page.getByRole('button', { name: 'Share song' }).click();
    await expect(page.locator('.error-box')).toContainText('Choose an audio file');
    await page.getByTestId('audio-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(page.locator('.error-box')).toHaveCount(1); // the old error clears when a new file is picked
    await expect(page.locator('.error-box')).toContainText('Choose an MP3, M4A or WAV');
    await page.getByTestId('audio-input').setInputFiles({ name: 'demo.wav', mimeType: 'audio/wav', buffer: wav(2) });
    await expect(page.getByText('Ready to share.')).toBeVisible();
    await page.getByRole('button', { name: 'Share song' }).click();
    await expect(page.locator('.error-box')).toContainText('Give the song a title');
  });

  test('New version must ask which song', async ({ page }) => {
    await page.getByRole('button', { name: 'New version' }).click();
    await expect(page.getByRole('heading', { name: 'New version' })).toBeVisible();
    await expect(page.getByLabel('Which song?')).toBeVisible();
    await expect(page.getByLabel('Song title')).toHaveCount(0);
    await page.getByTestId('audio-input').setInputFiles({ name: 'take.wav', mimeType: 'audio/wav', buffer: wav(2) });
    await expect(page.getByText('Ready to share.')).toBeVisible();
    await page.getByRole('button', { name: 'Share song' }).click();
    await expect(page.locator('.error-box')).toContainText('Choose which song');
  });

  test('sharing a new song saves it and opens its page; WAV shows a size warning', async ({ page }, info) => {
    const title = `Test Song ${info.project.name}`;
    await page.getByTestId('audio-input').setInputFiles({ name: 'test-song.wav', mimeType: 'audio/wav', buffer: wav(3) });
    await expect(page.getByTestId('upload-progress')).toContainText('test-song.wav');
    await expect(page.getByRole('progressbar', { name: 'Upload progress' })).toHaveAttribute('aria-valuenow', '100');
    await expect(page.getByText('WAV files are large.')).toBeVisible();
    await expect(page.getByText('Ready to share.')).toBeVisible();
    await page.getByLabel('Song title').fill(title);
    await page.getByLabel('Key').selectOption('D');
    await page.getByLabel('Tempo (BPM)').fill('88');
    await page.getByLabel('Lyrics').fill('VERSE 1\nA test lyric line');
    await page.getByLabel('Feedback focus').fill('Is the chorus clear?');
    await page.getByText('Draft', { exact: true }).click();
    await page.getByRole('button', { name: 'Share song' }).click();
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(page.locator('.tag').first()).toHaveText('Draft');
    await expect(page.getByText('Key of D · 88 BPM')).toBeVisible();
    await expect(page.getByTestId('writer-card')).toBeVisible();
    await expect(page.getByText('0:03')).toBeVisible();
    const [row] = await db<{ status: string; duration_seconds: number; version_number: number }>(
      'select s.status, v.duration_seconds, v.version_number from songs s join song_versions v on v.song_id = s.id where s.title = $1',
      [title],
    );
    expect(row).toEqual({ status: 'draft', duration_seconds: 3, version_number: 1 });
    await db('delete from songs where title = $1', [title]); // keep library counts stable for other tests
  });

  test('sharing a new version adds the next version number', async ({ page }) => {
    const id = await songId('Psalm 46 (River)');
    await page.goto(`/upload?mode=version&song=${id}`);
    await page.getByTestId('audio-input').setInputFiles({ name: 'psalm46-v2.wav', mimeType: 'audio/wav', buffer: wav(2) });
    await expect(page.getByText('Ready to share.')).toBeVisible();
    await page.getByRole('button', { name: 'Share song' }).click();
    await expect(page.getByRole('heading', { name: 'Psalm 46 (River)', level: 1 })).toBeVisible();
    await expect(page.getByTestId('versions').getByRole('link', { name: 'v2 · latest' })).toBeVisible();
    await db("delete from song_versions where version_number > 1 and song_id = $1", [id]);
    await db("update songs set status = 'draft' where id = $1", [id]);
  });
});
