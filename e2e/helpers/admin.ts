import { expect, type Page } from '@playwright/test';
import { unwrapApiData } from '../../lib/api-client';
import { clickSidebarModule } from './sidebar';

/** Ouvre le Backoffice unifié via sidebar (session admin requise). */
export async function openAdminControl(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: /admin ans/i })).toBeVisible({ timeout: 25_000 });
  await clickSidebarModule(page, /^Backoffice$/i, /^Administration$/);
  await page.waitForURL('**/administration/**', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: /santé/i })).toBeVisible({ timeout: 90_000 });
}

/** Appel API authentifié (cookies session Playwright) avec retry. */
export async function fetchApi(
  page: Page,
  path: string,
  init?: RequestInit,
  retries = 5,
): Promise<{ status: number; body: unknown }> {
  let last = { status: 0, body: null as unknown };
  for (let i = 0; i < retries; i++) {
    const headers = {
      ...(init?.headers as Record<string, string> | undefined),
    };
    const method = init?.method ?? 'GET';
    const fetchInit: Parameters<Page['request']['fetch']>[1] = { method, headers };

    if (init?.body) {
      if (typeof init.body === 'string') {
        try {
          fetchInit.data = JSON.parse(init.body);
        } catch {
          fetchInit.data = init.body;
        }
      } else {
        fetchInit.data = init.body;
      }
    }

    const res = await page.request.fetch(path, fetchInit);
    const raw = await res.json().catch(() => null);
    last = {
      status: res.status(),
      body: raw == null ? null : unwrapApiData(raw),
    };
    if (last.status !== 404 && last.status !== 401) return last;
    if (last.status === 401 && i < retries - 1) {
      await page.waitForTimeout(1500);
      continue;
    }
    if (last.status !== 404) return last;
    await page.waitForTimeout(1200);
  }
  return last;
}
