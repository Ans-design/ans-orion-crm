import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { e2eEnv } from './e2e/helpers/env';

/** Local : serveur E2E sur :3199. Prod smoke : E2E_REMOTE=true + E2E_BASE_URL. */
const isRemoteE2E = process.env.E2E_REMOTE === 'true';
const baseURL = isRemoteE2E
  ? (process.env.E2E_BASE_URL || 'http://localhost:3199')
  : 'http://localhost:3199';
const e2eServerEnv = e2eEnv();
const prodAuthState = path.join(__dirname, 'e2e', '.auth', 'prod-admin.json');
const localAuthState = path.join(__dirname, 'e2e', '.auth', 'local-admin.json');
const authState = isRemoteE2E ? prodAuthState : localAuthState;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: isRemoteE2E ? 120_000 : 90_000,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    ...(isRemoteE2E
      ? []
      : [{
          name: 'setup',
          testMatch: /auth\.setup\.ts/,
          use: { storageState: { cookies: [], origins: [] } },
        }]),
    {
      name: 'chromium',
      ...(isRemoteE2E ? {} : { dependencies: ['setup'] }),
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: authState,
        launchOptions: {
          channel: process.env.PLAYWRIGHT_CHANNEL as 'msedge' | 'chrome' | undefined,
        },
      },
    },
    {
      name: 'tablet',
      ...(isRemoteE2E ? {} : { dependencies: ['setup'] }),
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
        storageState: authState,
        launchOptions: {
          channel: process.env.PLAYWRIGHT_CHANNEL as 'msedge' | 'chrome' | undefined,
        },
      },
    },
    {
      name: 'smartphone',
      ...(isRemoteE2E ? {} : { dependencies: ['setup'] }),
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        storageState: authState,
        launchOptions: {
          channel: process.env.PLAYWRIGHT_CHANNEL as 'msedge' | 'chrome' | undefined,
        },
      },
    },
  ],
  webServer:
    process.env.E2E_SKIP_SERVER || isRemoteE2E
      ? undefined
      : {
          command: 'npm run e2e:server',
          url: `${baseURL}/login`,
          reuseExistingServer: !process.env.CI && process.env.E2E_FORCE_FRESH_SERVER !== '1',
          timeout: 300_000,
          env: e2eServerEnv,
          stdout: 'pipe',
          stderr: 'pipe',
          wait: {
            stdout: /serveur frais vérifié/,
          },
        },
});