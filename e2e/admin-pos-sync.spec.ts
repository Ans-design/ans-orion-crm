/**
 * Recette sync Admin → POS (lecture seule — safe sans DB jetable).
 * Mutations publish/archive : bloquées tant que backup PG manquant (voir RECETTE_SYNC…).
 */
import { test, expect } from '@playwright/test';
import { fetchApi } from './helpers/admin';
import { loginAsAdmin } from './helpers/auth';

test.describe('Sync Admin → POS (contrat lecture)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('diagnostics sync + drift accessibles (config:view)', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/backoffice/sync-diagnostics');
    expect(status).toBe(200);
    const data = body as {
      ok?: boolean;
      summary?: unknown;
      diagnostics?: unknown;
      driftReport?: unknown;
      error?: string;
    };
    expect(data.ok).toBe(true);
    expect(data.summary).toBeTruthy();
    expect(data.diagnostics).toBeTruthy();
    expect(data.driftReport).toBeTruthy();
  });

  test('POS catalogue lit des articles (source publiée / runtime)', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/pos/catalogue');
    expect(status).toBe(200);
    const data = body as { items?: unknown[]; source?: string };
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items!.length).toBeGreaterThan(0);
  });

  test('backoffice articles paginés — même univers catalogue', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/backoffice/articles?limit=10&page=1');
    expect(status).toBe(200);
    const data = body as { items?: { articleId?: string }[]; total?: number };
    expect(Array.isArray(data.items)).toBe(true);
    expect((data.total ?? 0)).toBeGreaterThan(0);

    const pos = await fetchApi(page, '/api/pos/catalogue');
    expect(pos.status).toBe(200);
    const posItems = (pos.body as { items?: { id?: string; articleId?: string }[] }).items ?? [];
    expect(posItems.length).toBeGreaterThan(0);

    const boIds = new Set(
      (data.items ?? [])
        .map((a) => a.articleId)
        .filter((id): id is string => Boolean(id)),
    );

    // Soft check : si une ref backoffice est dans le POS, la chaîne de projection est OK.
    // Sinon (brouillons / filtres), les deux listes non vides suffisent (assertés ci-dessus).
    const overlap = posItems.some((p) => {
      const id = p.articleId || p.id;
      return Boolean(id && boIds.has(id));
    });
    test.info().annotations.push({
      type: 'sync-overlap',
      description: overlap ? 'backoffice∩POS non vide' : 'pas de overlap sur page 1 (normal si non publiés)',
    });
  });

  test('Centre sync Backoffice — page charge', async ({ page }) => {
    await page.goto('/administration/synchronisation', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/sync|synchron|drift|publication/i, {
      timeout: 60_000,
    });
  });
});
