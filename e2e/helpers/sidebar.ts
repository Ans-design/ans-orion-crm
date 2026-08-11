import type { Page } from '@playwright/test';

/** Ouvre un univers sidebar V2 si replié (accordéon). */
export async function expandSidebarUniverse(page: Page, label: string | RegExp) {
  const btn = page.getByRole('button', { name: label }).first();
  const expanded = await btn.getAttribute('aria-expanded');
  if (expanded === 'false') {
    await btn.click();
  }
}

/** Navigue vers un sous-module via la sidebar (ouvre l'univers si nécessaire). */
export async function clickSidebarModule(
  page: Page,
  moduleName: string | RegExp,
  universe?: string | RegExp,
) {
  if (universe) {
    await expandSidebarUniverse(page, universe);
  }
  await page.getByRole('button', { name: moduleName }).first().click();
}
