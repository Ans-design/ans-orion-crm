import { test, expect } from '@playwright/test';

const LEGACY_REDIRECTS: { from: string; to: string }[] = [
  { from: '/cockpit', to: '/dashboard' },
  { from: '/crm/clients', to: '/clients' },
  { from: '/catalogue-pos', to: '/pos' },
  { from: '/panier-devis', to: '/panier' },
  { from: '/communication/ans-talk', to: '/messagerie' },
  { from: '/finance/paiements', to: '/paiements' },
  { from: '/finance/factures', to: '/factures' },
  { from: '/logistique', to: '/livraisons' },
  { from: '/ans-talk', to: '/messagerie' },
  { from: '/gpao', to: '/production' },
];

test.describe('Legacy URL redirects', () => {
  for (const { from, to } of LEGACY_REDIRECTS) {
    test(`${from} → ${to}`, async ({ page }) => {
      const response = await page.goto(from, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);
      await page.waitForURL(`**${to}**`, { timeout: 20_000 });
      expect(page.url()).toContain(to);
    });
  }
});
