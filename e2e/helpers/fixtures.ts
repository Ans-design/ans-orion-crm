import { expect, type Locator, type Page } from '@playwright/test';

const E2E_CLIENT_PAYLOAD = {
  name: 'E2E Client Auto',
  nif: '999888777',
  email: 'e2e-auto@ans.test',
  type: 'Entreprise',
  forceDuplicate: true,
};

/** Garantit au moins une ligne client visible (création API si seed absent). */
export async function ensureClientListRow(page: Page): Promise<Locator> {
  await page.goto('/clients');
  await page.waitForURL('**/clients**', { timeout: 20_000 });

  const row = page.locator('table tbody tr').first();
  if (await row.isVisible({ timeout: 12_000 }).catch(() => false)) {
    return row;
  }

  const res = await page.request.post('/api/clients', { data: E2E_CLIENT_PAYLOAD });
  expect(res.ok(), `création client E2E: ${await res.text()}`).toBeTruthy();

  await page.reload();
  await expect(row).toBeVisible({ timeout: 20_000 });
  return row;
}

/** Ouvre le dashboard et attend la fin du chargement des graphiques. */
export async function openDashboardWithCharts(page: Page) {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /cockpit principal/i })).toBeVisible({
    timeout: 20_000,
  });
  await page
    .locator('.dashboard-grid .animate-pulse')
    .first()
    .waitFor({ state: 'detached', timeout: 45_000 })
    .catch(() => {});
}
