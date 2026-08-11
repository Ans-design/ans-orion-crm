import { expect, type Page } from '@playwright/test';

type ClientRow = { id: string; name: string; email?: string | null; tel?: string | null; nif?: string | null };

export async function fetchSeedClient(page: Page): Promise<ClientRow> {
  const list = await page.request.get('/api/clients?pageSize=5');
  expect(list.ok(), `liste clients: ${await list.text()}`).toBeTruthy();
  const body = (await list.json()) as {
    items?: ClientRow[];
    clients?: ClientRow[];
    data?: ClientRow[];
  };
  const clients = body.items ?? body.clients ?? body.data ?? [];
  const c = clients[0];
  expect(c?.id, 'au moins un client seedé pour le POS').toBeTruthy();
  return c!;
}

async function injectSalesClient(page: Page, client: ClientRow) {
  const sessionRes = await page.request.get('/api/auth/session');
  const session = (await sessionRes.json().catch(() => ({}))) as { user?: { id?: string } };
  const userId = session.user?.id;
  expect(userId, 'session user id pour clé sales client').toBeTruthy();
  await page.evaluate(
    ({ c, uid }) => {
      const snapshot = {
        id: c.id,
        name: c.name,
        email: c.email ?? null,
        tel: c.tel ?? null,
        nif: c.nif ?? null,
      };
      const raw = JSON.stringify(snapshot);
      localStorage.setItem('ans_sales_selected_client', raw);
      localStorage.setItem(`ans_sales_client_${uid}`, raw);
      window.dispatchEvent(new CustomEvent('salesClientChanged', { detail: snapshot }));
    },
    { c: client, uid: userId! },
  );
}

async function pickClientViaUi(page: Page, client: ClientRow) {
  const gate = page.getByRole('button', { name: /Commencer une nouvelle commande/i });
  if (await gate.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await gate.click();
  }

  const search = page.getByPlaceholder(/Nom, téléphone, email/i);
  await expect(search).toBeVisible({ timeout: 10_000 });
  const needle = (client.name || client.email || client.tel || 'a').slice(0, 24);
  await search.fill(needle);
  const resultBtn = page.locator('[role="dialog"] button').filter({ hasText: client.name }).first();
  await expect(resultBtn).toBeVisible({ timeout: 15_000 });
  await resultBtn.click();
}

/** Sélectionne un client CRM pour débloquer le POS (gate PosClientRequired). */
export async function ensurePosClientSelected(page: Page) {
  const client = await fetchSeedClient(page);

  // Injection locale d’abord (fiable hors UI / viewports étroits) puis confirmation via reload
  try {
    await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    await injectSalesClient(page, client);
    await page.reload({ waitUntil: 'domcontentloaded' });
  } catch {
    /* fallback UI ci-dessous */
  }

  await page.goto('/pos', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/pos**', { timeout: 20_000 });

  const gate = page.getByRole('button', { name: /Commencer une nouvelle commande/i });
  const changer = page.getByRole('button', { name: /Changer client/i });
  const searchArticle = page.getByLabel(/Rechercher un article/i);
  await expect(gate.or(changer).or(searchArticle)).toBeVisible({ timeout: 25_000 });

  if (await changer.isVisible().catch(() => false)) {
    return;
  }
  if (await searchArticle.isVisible().catch(() => false) && !(await gate.isVisible().catch(() => false))) {
    return;
  }

  if (await gate.isVisible().catch(() => false)) {
    try {
      await pickClientViaUi(page, client);
    } catch {
      await injectSalesClient(page, client);
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }

  await expect(changer.or(searchArticle)).toBeVisible({ timeout: 20_000 });
}

/** Vide le panier s'il contient des lignes (idempotent). */
export async function clearCartIfNeeded(page: Page) {
  await page.goto('/panier');
  await page.waitForURL('**/panier**', { timeout: 15_000 });

  const empty = page.getByText(/votre panier est vide|configurez vos impressions/i);
  if (await empty.first().isVisible({ timeout: 3000 }).catch(() => false)) return;

  const vider = page.getByRole('button', { name: /vider panier/i });
  if (await vider.isVisible({ timeout: 3000 }).catch(() => false)) {
    await vider.click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Vider le panier' }).click();
    await expect(page.getByText(/votre panier est vide|configurez vos impressions/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }
}

/** Sélectionne les champs obligatoires d'un flyer A6 pour le parcours E2E. */
export async function configureFlyA6(page: Page) {
  await expect(page.getByRole('heading', { name: /flyer/i })).toBeVisible({ timeout: 20_000 });
  // Attendre au moins une chip format (boutons ou options)
  await expect(page.getByText(/\bA6\b/i).first()).toBeVisible({ timeout: 20_000 });

  async function clickChip(patterns: RegExp[], label: string) {
    for (const pattern of patterns) {
      const loc = page
        .getByRole('button', { name: pattern })
        .or(page.getByRole('option', { name: pattern }))
        .first();
      if (await loc.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await loc.click();
        await page.waitForTimeout(300);
        return;
      }
    }
    // Dernier recours : texte visible cliquable
    for (const pattern of patterns) {
      const textLoc = page.getByText(pattern).first();
      if (await textLoc.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await textLoc.click();
        await page.waitForTimeout(300);
        return;
      }
    }
    throw new Error(`Chip POS introuvable (${label})`);
  }

  await clickChip([/^A6\b/i, /\bA6\b.*mm/i, /\bA6\b/i], 'format A6');
  await clickChip([/^PCB$/i], 'matiere PCB');
  await clickChip([/^250\s*g$/i, /^170\s*g$/i, /^150\s*g$/i, /^135\s*g$/i], 'grammage');
  await clickChip([/Recto-verso|Recto verso|^R\/V$/i, /^Recto$/i], 'face');
  await clickChip([/1 volet/i], 'volets');
  await clickChip([/^500\b/i, /^250\b/i, /^100\b/i], 'quantite');

  await expect(page.getByText(/à compléter/i)).toHaveCount(0, { timeout: 20_000 });

  const addBtn = page.getByRole('button', { name: /ajouter au panier/i });
  await expect(addBtn).toBeEnabled({ timeout: 45_000 });
}

/** Configure un flyer et l'ajoute au panier. */
export async function addArticleToCart(page: Page, articleId = 'fly-std') {
  await ensurePosClientSelected(page);
  await page.goto(`/pos/${articleId}`);

  // Re-sélection si la navigation a perdu le client (hydratation / clé user)
  const gate = page.getByRole('button', { name: /Commencer une nouvelle commande/i });
  if (await gate.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const client = await fetchSeedClient(page);
    await injectSalesClient(page, client);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(gate).toHaveCount(0, { timeout: 15_000 });
  }

  await expect(page.getByRole('button', { name: /ajouter au panier/i })).toBeVisible({
    timeout: 20_000,
  });
  await configureFlyA6(page);
  await expect(page.getByText(/0\/\d|à compléter/i)).not.toBeVisible({ timeout: 5000 }).catch(() => {});
  await page.getByRole('button', { name: /ajouter au panier/i }).click();
  await expect(page.getByText(/ajouté au panier/i)).toBeVisible({ timeout: 5000 });
}

/** Attend que le panier serveur contienne au moins une ligne. */
export async function waitForCartReady(page: Page) {
  await page.goto('/panier');
  await expect(page.getByRole('heading', { name: /panier\s*\/\s*devis|panier/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/votre panier est vide/i)).not.toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /créer devis/i })).toBeEnabled({ timeout: 15_000 });
}

/** Crée un devis depuis le panier courant. Retourne le numéro DEV. */
export async function createDevisFromCart(page: Page): Promise<string> {
  await waitForCartReady(page);

  const checkoutRes = page.waitForResponse(
    (r) => r.url().includes('/api/cart/checkout') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /créer devis/i }).click();

  const res = await checkoutRes;
  const raw = await res.text();
  expect(res.ok(), `checkout devis: ${raw}`).toBeTruthy();

  let body: {
    devis?: { id?: string; numero?: string };
    data?: { devis?: { id?: string; numero?: string } };
  } = {};
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    /* ignore */
  }
  const devis = body.devis ?? body.data?.devis;
  const numeroFromApi = devis?.numero?.trim();

  await page.waitForURL('**/devis**', { timeout: 30_000 });
  await expect(page.getByText(/Devis créé depuis le panier|Brouillon|DEV-/i).first()).toBeVisible({
    timeout: 20_000,
  });

  if (numeroFromApi) return numeroFromApi;

  const numeroUi = page.getByText(/DEV-\d{4}-\d+/).first();
  await expect(numeroUi).toBeVisible({ timeout: 15_000 });
  return ((await numeroUi.innerText()).match(/DEV-\d{4}-\d+/)?.[0] ?? '').trim();
}

/** Accepte un devis (API métier) et attend la commande liée. */
export async function acceptDevisByNumero(page: Page, numero: string) {
  const list = await page.request.get('/api/devis?pageSize=25');
  expect(list.ok(), `liste devis: ${await list.text()}`).toBeTruthy();
  const body = (await list.json()) as {
    items?: Array<{ id: string; numero: string }>;
    devis?: Array<{ id: string; numero: string }>;
  };
  const items = body.items ?? body.devis ?? [];
  const found = items.find((d) => d.numero === numero);
  expect(found?.id, `devis ${numero} introuvable`).toBeTruthy();

  const accept = await page.request.post(`/api/devis/${found!.id}/accept`);
  expect(accept.ok(), `accept devis: ${await accept.text()}`).toBeTruthy();

  // UI : hub commande si redirect, sinon liste
  await page.goto('/commandes');
  await expect(page.getByText(/CMD-|commande/i).first()).toBeVisible({ timeout: 20_000 });
}
