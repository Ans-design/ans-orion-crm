/**
 * Healthcheck Hostinger / staging — /api/health, /api/health/db, /api/health/ready (retries).
 */
const base = (process.env.SITE_URL || process.env.HOSTINGER_SITE_URL || 'https://darkorchid-badger-644294.hostingersite.com').replace(/\/$/, '');
const RETRIES = Number(process.env.HEALTHCHECK_RETRIES || 12);
const RETRY_MS = Number(process.env.HEALTHCHECK_RETRY_MS || 15_000);

async function probe(path: string, timeoutMs = 12_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, { signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    return { path, status: res.status, body };
  } catch (e) {
    return { path, status: 0, body: { error: String(e) } };
  } finally {
    clearTimeout(t);
  }
}

function isAppOk(r: Awaited<ReturnType<typeof probe>>) {
  return r.status === 200 && (r.body as { ok?: boolean }).ok;
}

function isDbOk(r: Awaited<ReturnType<typeof probe>>) {
  return r.status === 200 && (r.body as { ok?: boolean }).ok;
}

function isReadyOk(r: Awaited<ReturnType<typeof probe>>) {
  return r.status === 200 && (r.body as { ok?: boolean }).ok === true;
}

async function main() {
  console.log(`\n═══ Healthcheck ${base} ═══\n`);

  let health = await probe('/api/health', 10_000);
  let db = await probe('/api/health/db', 18_000);
  let ready = await probe('/api/health/ready', 15_000);

  for (let i = 1; i <= RETRIES && (!isAppOk(health) || !isDbOk(db) || !isReadyOk(ready)); i++) {
    console.log(`Tentative ${i}/${RETRIES} — attente ${RETRY_MS / 1000}s…`);
    console.log(`  /api/health → ${health.status}`, JSON.stringify(health.body));
    console.log(`  /api/health/db → ${db.status}`, JSON.stringify(db.body));
    console.log(`  /api/health/ready → ${ready.status}`, JSON.stringify(ready.body));
    await new Promise((r) => setTimeout(r, RETRY_MS));
    health = await probe('/api/health', 10_000);
    db = await probe('/api/health/db', 18_000);
    ready = await probe('/api/health/ready', 15_000);
  }

  console.log(`/api/health → ${health.status}`, JSON.stringify(health.body));
  console.log(`/api/health/db → ${db.status}`, JSON.stringify(db.body));
  console.log(`/api/health/ready → ${ready.status}`, JSON.stringify(ready.body));

  if (!isAppOk(health)) {
    console.log('\n❌ Application inaccessible (déploiement en cours ou crash — vérifiez hPanel)\n');
    process.exit(1);
  }
  if (!isDbOk(db)) {
    console.log('\n⚠ App OK mais base Neon inaccessible — voir deploy/hostinger/REDEPLOY.md\n');
    process.exit(1);
  }
  if (!isReadyOk(ready)) {
    console.log('\n⚠ App + DB OK mais readiness incomplet (env / probe) — voir /api/health/ready\n');
    process.exit(1);
  }
  console.log('\n✅ Application + Neon PostgreSQL + readiness OK\n');
}

main();
