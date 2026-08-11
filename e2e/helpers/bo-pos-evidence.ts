/**
 * Helpers E2E — preuve Backoffice → POS / devis / commande.
 * Tous les appels passent par HTTP (page.request) — jamais import direct du moteur tarifaire.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { unwrapApiData } from '../../lib/api-client';

export const E2E_BO_POS_ARTICLE_ID = 'e2e-bo-pos';

export type PricePreviewBody = {
  ok?: boolean;
  error?: string;
  code?: string;
  tariff?: {
    unitPriceAr?: number | null;
    totalHtAr?: number | null;
    provenance?: string;
    tariffVersion?: string | null;
    formulaVersion?: number | null;
    releaseId?: string | null;
  };
  result?: { prixUnitaire?: number; totalHT?: number; snapshot?: Record<string, unknown> };
  provenance?: string;
};

type PriceBlock = {
  id: string;
  kind: string;
  enabled: boolean;
  value?: number | null;
  label?: string;
};

function fixedPriceBlocks(unitPriceAr: number, label: string): PriceBlock[] {
  return [
    {
      id: `blk_base_${unitPriceAr}`,
      kind: 'base_fixed',
      enabled: true,
      value: unitPriceAr,
      label,
    },
  ];
}

async function jsonFetch(
  page: Page,
  path: string,
  init?: { method?: string; data?: unknown },
) {
  const res = await page.request.fetch(path, {
    method: init?.method ?? 'GET',
    data: init?.data as object | undefined,
    headers: { 'Content-Type': 'application/json' },
  });
  const raw = await res.json().catch(() => null);
  return {
    status: res.status(),
    body: raw == null ? null : unwrapApiData(raw),
    raw,
  };
}

/** Crée le profil si besoin + version brouillon à prix unitaire exact (blocs visuels). */
export async function ensureE2eDraftTariff(
  page: Page,
  opts: { unitPriceAr: number; label?: string },
) {
  const get = await jsonFetch(page, `/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`);
  const missing =
    get.status === 404
    || (get.body as { error?: string })?.error === 'Profil introuvable'
    || (get.body as { profile?: unknown })?.profile == null;

  if (missing) {
    const created = await jsonFetch(page, '/api/backoffice/articles', {
      method: 'POST',
      data: {
        articleId: E2E_BO_POS_ARTICLE_ID,
        articleLabel: opts.label ?? 'E2E Preuve Backoffice POS',
        family: 'goodies',
        calculationType: 'formula',
        saleUnit: 'pièce',
        status: 'draft',
        prixBase: opts.unitPriceAr,
      },
    });
    expect([200, 201].includes(created.status), `create: ${JSON.stringify(created.body)}`).toBe(true);
  }

  const profile = await jsonFetch(page, `/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, {
    method: 'PATCH',
    data: { section: 'profile', prixBase: opts.unitPriceAr },
  });
  expect(profile.status, `patch profile: ${JSON.stringify(profile.body)}`).toBe(200);

  const formula = await jsonFetch(page, `/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, {
    method: 'PATCH',
    data: {
      section: 'formula',
      blocks: fixedPriceBlocks(opts.unitPriceAr, `E2E ${opts.unitPriceAr}`),
      simpleFormula: `base = ${opts.unitPriceAr}`,
      label: `E2E draft ${opts.unitPriceAr}`,
      source: 'e2e-bo-pos-evidence',
    },
  });
  expect(formula.status, `formula draft: ${JSON.stringify(formula.body)}`).toBe(200);
  return formula.body as { result?: { version?: number; status?: string } };
}

export async function publishE2eArticle(page: Page) {
  const res = await jsonFetch(page, `/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, {
    method: 'POST',
    data: { action: 'publish' },
  });
  expect(res.status, `publish: ${JSON.stringify(res.body)}`).toBe(200);
  const body = res.body as { formulaVersion?: number; status?: string; success?: boolean };
  expect(body.success === true || body.status === 'published').toBeTruthy();
  return body;
}

export async function unpublishE2eArticle(page: Page) {
  return jsonFetch(page, `/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, {
    method: 'POST',
    data: { action: 'unpublish' },
  });
}

export async function posPricePreview(
  page: Page,
  config: Record<string, unknown> = { qty: 1 },
): Promise<{ status: number; body: PricePreviewBody }> {
  const res = await jsonFetch(page, '/api/pos/price-preview', {
    method: 'POST',
    data: {
      articleId: E2E_BO_POS_ARTICLE_ID,
      config,
    },
  });
  return { status: res.status, body: res.body as PricePreviewBody };
}

export function extractUnitPrice(body: PricePreviewBody): number | null {
  const fromTariff = body.tariff?.unitPriceAr;
  if (typeof fromTariff === 'number' && Number.isFinite(fromTariff)) return fromTariff;
  const fromResult = body.result?.prixUnitaire;
  if (typeof fromResult === 'number' && Number.isFinite(fromResult)) return fromResult;
  return null;
}

export async function cartValidateE2e(page: Page, quantity = 1) {
  return jsonFetch(page, '/api/cart', {
    method: 'POST',
    data: {
      items: [
        {
          articleId: E2E_BO_POS_ARTICLE_ID,
          name: 'E2E Preuve Backoffice POS',
          category: 'goodies',
          config: { qty: quantity },
          quantity,
        },
      ],
    },
  });
}

export async function checkoutDevisFromE2eArticle(
  page: Page,
  clientId: string,
  quantity: number,
  expectedUnit: number,
) {
  const res = await jsonFetch(page, '/api/cart/checkout', {
    method: 'POST',
    data: {
      action: 'devis',
      items: [
        {
          articleId: E2E_BO_POS_ARTICLE_ID,
          name: 'E2E Preuve Backoffice POS',
          category: 'goodies',
          config: { qty: quantity },
          quantity,
        },
      ],
      meta: { clientId },
    },
  });
  expect(res.status, `checkout devis: ${JSON.stringify(res.body)}`).toBe(200);
  const body = res.body as {
    devis?: { id: string; numero: string; total?: number };
    totals?: { totalGeneral?: number };
  };
  expect(body.devis?.id).toBeTruthy();
  const lineTotal = expectedUnit * quantity;
  if (typeof body.totals?.totalGeneral === 'number') {
    expect(body.totals.totalGeneral).toBe(lineTotal);
  }
  return body.devis!;
}

export async function fetchFirstClientId(page: Page): Promise<string> {
  const res = await jsonFetch(page, '/api/clients?pageSize=5');
  expect(res.status).toBe(200);
  const body = res.body as { items?: { id: string }[]; clients?: { id: string }[]; data?: { id: string }[] };
  const clients = body.items ?? body.clients ?? body.data ?? [];
  expect(clients[0]?.id).toBeTruthy();
  return clients[0]!.id;
}

export async function acceptDevisId(page: Page, devisId: string) {
  const res = await jsonFetch(page, `/api/devis/${devisId}/accept`, { method: 'POST', data: {} });
  expect(res.status, `accept: ${JSON.stringify(res.body)}`).toBeLessThan(300);
  const body = res.body as {
    commande?: { id?: string; numero?: string };
    commandeId?: string;
  };
  const commandeId = body.commande?.id ?? body.commandeId;
  expect(commandeId, `accept sans commandeId: ${JSON.stringify(body)}`).toBeTruthy();
  return { ...body, commandeId: commandeId! };
}

export async function getCommandeById(page: Page, id: string) {
  const res = await jsonFetch(page, `/api/commandes/${id}`);
  expect(res.status).toBe(200);
  return res.body as { id: string; total?: number; acompte?: number; reste?: number; numero?: string };
}

export async function cleanupE2eArticle(page: Page) {
  await unpublishE2eArticle(page).catch(() => null);
  await jsonFetch(page, `/api/backoffice/articles/${E2E_BO_POS_ARTICLE_ID}?hard=true`, {
    method: 'DELETE',
  }).catch(() => null);
}

export async function publishViaRequest(request: APIRequestContext) {
  return request.fetch(`/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, {
    method: 'POST',
    data: { action: 'publish' },
    headers: { 'Content-Type': 'application/json' },
  });
}
