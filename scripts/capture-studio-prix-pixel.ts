/**
 * Capture manuelle Studio Prix @ 2048×629 contre un serveur déjà lancé
 * (ex. http://127.0.0.1:3020).
 *
 * Usage :
 *   npx tsx scripts/capture-studio-prix-pixel.ts
 *   BASE_URL=http://127.0.0.1:3020 npx tsx scripts/capture-studio-prix-pixel.ts
 *
 * Nécessite une session (cookies) — préférer le spec Playwright authentifié
 * `e2e/studio-prix-pixel-perfect.spec.ts` pour la comparaison visuelle.
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3020';
const OUT = path.join(
  process.cwd(),
  'docs',
  'ui-references',
  'studio-prix-articles-2048x629-manual.png',
);

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 2048, height: 629 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'fr-FR',
  });
  await page.goto(
    `${BASE}/administration/catalogue-prix-stock?studio=prix&tab=articles`,
    { waitUntil: 'domcontentloaded', timeout: 60_000 },
  );
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT, fullPage: false });
  console.log('Wrote', OUT);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
