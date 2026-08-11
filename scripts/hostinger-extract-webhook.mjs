/**
 * Extrait le webhook Git Hostinger via CDP (écoute réseau + DOM).
 */
import fs from 'fs';
import path from 'path';
import {
  EMAIL,
  PASSWORD,
  connectCdp,
  ensureHpanelLogin,
  openDeploymentsPage,
  saveWebhookUrl,
  shot,
} from './hostinger-cdp-shared.mjs';

const OUT = path.join(process.cwd(), 'deploy', 'hostinger', '.git-webhook-url');

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('HOSTINGER_EMAIL et HOSTINGER_PASSWORD requis');
    process.exit(1);
  }

  const found = new Set();
  const { browser, page } = await connectCdp();

  page.on('response', async (res) => {
    try {
      const url = res.url();
      if (url.includes('webhook') || url.includes('builders.hostinger') || url.includes('git/deploy')) {
        found.add(url);
      }
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('json')) {
        const text = await res.text();
        const matches = text.match(/https:\/\/[^\s"']+/g) || [];
        for (const m of matches) {
          if (m.includes('webhook') || m.includes('builders.hostinger')) found.add(m.replace(/\\u002F/g, '/'));
        }
      }
    } catch {
      /* ignore */
    }
  });

  try {
    await ensureHpanelLogin(page);
    await openDeploymentsPage(page);

    const settings = page.getByRole('button', { name: /paramètres et redéploiement/i }).first();
    if (await settings.isVisible({ timeout: 8000 }).catch(() => false)) {
      await settings.click();
      await page.waitForTimeout(5000);
    }
    await shot(page, 'webhook-settings');

    const bodyText = await page.locator('body').innerText();
    const textMatches = bodyText.match(/https:\/\/\S+/g) || [];
    for (const m of textMatches) {
      if (m.includes('webhook') || m.includes('builders.hostinger')) found.add(m);
    }

    const values = await page.locator('input, textarea, code, pre, [data-copy], [data-clipboard-text]').evaluateAll((els) =>
      els.map((el) => el.value || el.textContent || el.getAttribute('data-clipboard-text') || '').filter(Boolean),
    );
    for (const v of values) {
      if (v.includes('https://') && (v.includes('webhook') || v.includes('builders.hostinger'))) found.add(v.trim());
    }

    const copyBtns = page.getByRole('button', { name: /copier|copy/i });
    const n = await copyBtns.count();
    for (let i = 0; i < n; i++) {
      await copyBtns.nth(i).click().catch(() => {});
      await page.waitForTimeout(500);
    }
  } finally {
    await browser.close();
  }

  const list = [...found].filter((u) => u.startsWith('https://'));
  console.log('URLs trouvées:', list.length ? list : '(aucune)');
  const webhook = list.find((u) => u.includes('webhook')) || list.find((u) => u.includes('builders.hostinger'));
  if (webhook) {
    await saveWebhookUrl(webhook);
    const res = await fetch(webhook, { method: 'POST' });
    console.log('Test POST →', res.status);
  } else {
    console.log('\nWebhook introuvable automatiquement.');
    console.log('hPanel → Déploiements → Paramètres → copier l\'URL webhook');
    console.log('Collez dans deploy/hostinger/.git-webhook-url');
    if (fs.existsSync(OUT)) console.log('Fichier existant conservé:', OUT);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
