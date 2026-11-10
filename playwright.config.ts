import { defineConfig, devices } from '@playwright/test';

/**
 * Click-through tests on every screen at phone (390 px) and laptop (1280 px) widths,
 * in light and dark mode. Runs against `next start` in AUTH_MODE=local with a freshly
 * seeded E2E_DATABASE_URL (see tests/e2e/global-setup.ts).
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);
const DB = process.env.E2E_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5433/pbc_e2e';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off' },
  projects: [
    { name: 'phone-light', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, colorScheme: 'light', hasTouch: true } },
    { name: 'phone-dark', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true } },
    { name: 'laptop-light', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, colorScheme: 'light' } },
    { name: 'laptop-dark', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, colorScheme: 'dark' } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: DB,
      AUTH_MODE: 'local',
      NEON_AUTH_COOKIE_SECRET: 'e2e-cookie-secret-0123456789-abcdefghijklmnop',
    },
  },
});
