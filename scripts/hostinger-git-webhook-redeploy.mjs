/**
 * Déclenche un redéploiement Git Hostinger via webhook hPanel.
 * URL : deploy/hostinger/.git-webhook-url (une ligne)
 * Ou env HOSTINGER_GIT_WEBHOOK_URL
 */
import fs from 'fs';
import path from 'path';

const URL_FILE = path.join(process.cwd(), 'deploy', 'hostinger', '.git-webhook-url');
const WEBHOOK =
  process.env.HOSTINGER_GIT_WEBHOOK_URL ||
  (fs.existsSync(URL_FILE) ? fs.readFileSync(URL_FILE, 'utf8').trim() : '');

async function main() {
  if (!WEBHOOK) {
    console.error('Webhook Git absent.');
    console.error('hPanel → Sites → Git → Auto Deployment → copier l’URL dans deploy/hostinger/.git-webhook-url');
    process.exit(1);
  }

  console.log('→ POST webhook Git Hostinger…');
  const res = await fetch(WEBHOOK, { method: 'POST' });
  const text = await res.text().catch(() => '');
  console.log(`HTTP ${res.status}`, text.slice(0, 200));
  if (!res.ok) {
    throw new Error(`Webhook échoué: ${res.status}`);
  }
  console.log('✓ Déploiement Git déclenché — attendez 5–10 min');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
