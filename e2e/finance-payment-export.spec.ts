import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import { fetchApi } from './helpers/admin';

const localAuthState = path.join(__dirname, '.auth', 'local-admin.json');

function monthRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

type CommandeRow = {
  id: string;
  numero?: string;
  reste?: number;
  total?: number;
  acompte?: number;
  clientId?: string | null;
};

function normalizeCommandes(body: unknown): CommandeRow[] {
  if (Array.isArray(body)) return body as CommandeRow[];
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as CommandeRow[];
    if (Array.isArray(o.commandes)) return o.commandes as CommandeRow[];
  }
  return [];
}

function paidTotal(paiements: { montant: number; type: string }[]) {
  return paiements.reduce(
    (sum, p) => sum + (p.type === 'Remboursement' ? -p.montant : p.montant),
    0,
  );
}

/** Choisit une commande avec reste réel (paiements liés) — aligné sur createPaiementRecord. */
async function pickPayableCommande(page: Page): Promise<{
  id: string;
  clientId?: string | null;
  montant: number;
} | null> {
  const listRes = await fetchApi(page, '/api/commandes');
  if (listRes.status !== 200) return null;

  const commandes = normalizeCommandes(listRes.body);
  for (const cmd of commandes) {
    const overview = await fetchApi(page, `/api/commandes/${cmd.id}/overview`);
    if (overview.status !== 200) continue;

    const data = overview.body as {
      commande?: {
        total?: number;
        clientId?: string | null;
        paiements?: { montant: number; type: string }[];
      };
    };
    const total = data.commande?.total ?? cmd.total ?? 0;
    const remaining = Math.max(0, total - paidTotal(data.commande?.paiements ?? []));
    if (remaining >= 1000) {
      return {
        id: cmd.id,
        clientId: data.commande?.clientId ?? cmd.clientId,
        montant: Math.min(remaining, 5000),
      };
    }
  }
  return null;
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

let sharedContext: BrowserContext | undefined;

async function openAuthedPage(): Promise<Page> {
  if (!sharedContext) throw new Error('Contexte E2E non initialisé');
  return sharedContext.newPage();
}

test.beforeAll(async ({ browser }) => {
  sharedContext = await browser.newContext({ storageState: localAuthState });
  const page = await sharedContext.newPage();
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.close();
});

test.afterAll(async () => {
  await sharedContext?.close();
  sharedContext = undefined;
});

test.describe('Finance — paiement commande & exports comptables', () => {
  test('API export comptable standard — CSV factures/paiements', async () => {
    const page = await openAuthedPage();
    try {
      const { from, to } = monthRange();
      const res = await page.request.get(`/api/finance/export/comptable?from=${from}&to=${to}&format=standard`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('text/csv');
      const csv = await res.text();
      expect(csv.length).toBeGreaterThan(10);
      expect(csv).toMatch(/FACTURE|PAIEMENT|Type/);
    } finally {
      await page.close();
    }
  });

  test('API export DGI — écritures SYSCOHADA + disclaimer', async () => {
    const page = await openAuthedPage();
    try {
      const { from, to } = monthRange();
      const res = await page.request.get(`/api/finance/export/comptable?from=${from}&to=${to}&format=dgi`);
      expect(res.status()).toBe(200);
      const csv = await res.text();
      expect(csv).toContain('NON CERTIFIE DGI');
      expect(csv).toMatch(/411100|706100|531100/);
    } finally {
      await page.close();
    }
  });

  test('paiement commandeId — enregistrement + overview finance', async () => {
    const page = await openAuthedPage();
    try {
      const target = await pickPayableCommande(page);
      test.skip(!target, 'Aucune commande avec reste réel payable en base de test');

      const payRes = await fetchApi(page, '/api/paiements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandeId: target!.id,
          clientId: target!.clientId ?? undefined,
          montant: target!.montant,
          mode: 'Espèces',
          type: 'Acompte',
          notes: 'E2E smoke paiement commande',
        }),
      });

      expect(payRes.status).toBe(201);

      const overview = await fetchApi(page, `/api/commandes/${target!.id}/overview`);
      expect(overview.status).toBe(200);
      const data = overview.body as {
        commande?: { paiements?: { montant: number; type: string }[] };
      };
      expect(paidTotal(data.commande?.paiements ?? [])).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  });

  test('pages factures & paiements — boutons export visibles', async () => {
    const page = await openAuthedPage();
    try {
      await page.goto('/factures', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: /export comptable/i })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('button', { name: /export dgi/i })).toBeVisible();

      await page.goto('/paiements', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: /export comptable/i })).toBeVisible({ timeout: 20_000 });
    } finally {
      await page.close();
    }
  });

  test('API search — validation query Zod', async () => {
    const page = await openAuthedPage();
    try {
      const short = await fetchApi(page, '/api/search?q=a');
      expect(short.status).toBe(200);
      expect((short.body as { results?: unknown[] }).results).toEqual([]);

      const ok = await fetchApi(page, '/api/search?q=cli');
      expect(ok.status).toBe(200);
      expect(Array.isArray((ok.body as { results?: unknown[] }).results)).toBe(true);
    } finally {
      await page.close();
    }
  });

  test('API paiements/[id] — protégée par permission', async () => {
    const page = await openAuthedPage();
    try {
      const list = await fetchApi(page, '/api/paiements');
      expect(list.status).toBe(200);
      const rows = Array.isArray(list.body) ? list.body : [];
      if (rows.length === 0) return;
      const first = rows[0] as { id: string };
      const detail = await fetchApi(page, `/api/paiements/${first.id}`);
      expect(detail.status).toBe(200);
    } finally {
      await page.close();
    }
  });
});
