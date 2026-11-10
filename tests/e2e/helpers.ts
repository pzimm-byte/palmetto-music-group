import { expect, type Page } from '@playwright/test';
import { Client } from 'pg';

export const DB_URL = process.env.E2E_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5433/pbc_e2e';
export const PASSWORD = 'e2e-demo-password';

export const USERS = {
  paul: 'paul@pbc-songwriters.test', // admin; writer of "Every Promise" and "Come, Weary Ones"
  sarah: 'sarah.mitchell@pbc-songwriters.test', // writer of "Grace Upon Grace"
  marcus: 'marcus.bell@pbc-songwriters.test', // plain member
  emily: 'emily.grace@pbc-songwriters.test', // inactive
};

export async function db<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

export async function songId(title: string): Promise<string> {
  const [r] = await db<{ id: string }>('select id from songs where title = $1', [title]);
  return r.id;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Every visible interactive element must be at least 44×44 px (rating dots use a 44 px ::after hit area). */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll<HTMLElement>('a[href], button, input:not([type=hidden]):not(.sr-only), select, textarea, [role=slider], [role=tab]');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none') continue;
      if (el.classList.contains('rate-dot')) {
        const after = getComputedStyle(el, '::after');
        if (after.content !== 'none' && after.position === 'absolute' && r.width >= 40) continue;
      }
      if ((el as HTMLInputElement).type === 'radio' && el.closest('label.radio-card')) continue; // whole card is the target
      if (r.width < 44 || r.height < 44) out.push(`${el.tagName}.${el.className} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  });
  expect(small, 'touch targets smaller than 44px').toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0);
}

export function wav(seconds = 2, sampleRate = 8000): Buffer {
  const samples = seconds * sampleRate;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buf.writeInt16LE(Math.round(3000 * Math.sin((i / sampleRate) * 2 * Math.PI * 220)), 44 + i * 2);
  return buf;
}
