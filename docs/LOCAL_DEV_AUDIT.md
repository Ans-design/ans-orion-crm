# Audit local dev — ANS ORION

Date : juin 2026  
Environnements cibles : **local (127.0.0.1:3001)** + **Vercel** — pas Hostinger.

---

## Problèmes observés

| Symptôme | Impact |
|----------|--------|
| HTML brut sans CSS | Interface illisible |
| `GET /_next/static/css/...` 404 | Styles absents |
| `GET /_next/static/chunks/...` 404 | JS cassé, ChunkLoadError |
| ERR_CONNECTION_REFUSED | Serveur arrêté ou mauvais port |
| URL tapée dans PowerShell | Erreur utilisateur (pas une commande) |
| PDF devis 404 | Devis absent en base ou ID invalide |

---

## Causes identifiées

### 1. Surcharge webpack (cause principale des 404 chunks/CSS)

Dans `next.config.js`, un bloc `webpack` forçait :

```js
config.output.filename = 'static/chunks/[name]-[contenthash:8].js';
config.output.chunkFilename = 'static/chunks/[contenthash:16].js';
```

Next.js génère et sert les assets sous `/_next/static/...` avec sa propre convention. Cette surcharge cassait la correspondance entre le HTML et les fichiers réels → **404**, **ChunkLoadError**, parfois rendu sans styles.

**Correction :** suppression complète de ce bloc.

### 2. `outputFileTracingRoot` incorrect

Pointait vers le répertoire parent (`../`) hors projet en local, ce qui pouvait perturber le tracing de build.

**Correction :** `path.join(__dirname)` (racine du projet).

### 3. Port / hôte incohérents

- Bannière indiquait `localhost:3000` alors que l’utilisateur changeait de port.
- `metadataBase` fixé sur `localhost:3000`.

**Correction :** port par défaut **3001**, hôte **127.0.0.1**, scripts et bannière alignés.

### 4. Cache `.next` obsolète

Après changement de config webpack, d’anciens hashes restaient en cache navigateur + dossier `.next`.

**Correction :** script `npm run dev:clean` + hard refresh documenté.

### 5. PDF devis 404

La route `app/api/devis/[id]/pdf/route.ts` existe et fonctionne. Un **404 JSON** signifie en général **devis introuvable** en base (ID seed différent, DB vide). Ce n’est pas une route manquante.

**Correction :** message d’erreur explicite avec hint `npm run db:sync`.

### 6. Pas de service worker

Aucun `service-worker`, `next-pwa` ou Workbox détecté. Le manifest PWA (`public/manifest.json`) ne cache pas les chunks Next.

---

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `next.config.js` | Suppression override webpack ; fix `outputFileTracingRoot` |
| `package.json` | `dev:clean`, `dev:local` stabilisé |
| `scripts/print-local-banner.mjs` | Instructions claires port 3001 |
| `scripts/run-local.mjs` | `-p 3001 -H 127.0.0.1` par défaut |
| `scripts/dev-clean.mjs` | **nouveau** — purge `.next` + cache |
| `scripts/setup-local.mjs` | Port 3001 |
| `app/layout.tsx` | `metadataBase` dynamique |
| `app/providers.tsx` | Rechargement auto unique sur ChunkLoadError |
| `middleware.ts` | `/dev-health` public |
| `app/dev-health/page.tsx` | **nouveau** — diagnostic local |
| `app/api/devis/[id]/pdf/route.ts` | Message 404 plus explicite |
| `tailwind.config.ts` | `content` inclut `styles/` et `lib/` |

---

## Procédure de lancement (recommandée)

```powershell
cd "C:\Users\ans\Documents\ANS CRM V3"

# Si chunks/CSS 404 ou HTML brut :
npm run dev:clean

npm run dev:local
```

Puis dans le **navigateur** (pas dans PowerShell) :

- http://127.0.0.1:3001
- http://127.0.0.1:3001/dev-health

Hard refresh : `Ctrl+Shift+R`

### Alternative port custom

```powershell
$env:PORT="3002"; npm run dev:local
```

---

## Tests réalisés

- [x] `npm run dev:clean` puis `npm run dev:local` — serveur sur `http://127.0.0.1:3001`
- [x] `/dev-health` — 200, Tailwind visible (`bg-page`)
- [x] `/login` — 200
- [x] `/_next/static/css/app/layout.css` — **200** (241 Ko, pas de 404)
- [x] `/api/health` — 200
- [x] `npm run build` — OK (après arrêt du serveur dev + `dev:clean`)

**Important :** ne pas lancer `next build` pendant que `npm run dev:local` tourne — cela corrompt `.next`.

---

## Recommandations restantes

1. Définir dans `.env.local` : `NEXTAUTH_URL=http://127.0.0.1:3001`
2. Installer Google Chrome pour PDF local (ou définir `PUPPETEER_EXECUTABLE_PATH`)
3. Ne pas lancer plusieurs `next dev` en parallèle (conflit port / EPERM Prisma)
4. Après `prisma generate` bloqué (EPERM) : arrêter le serveur dev puis relancer
5. Déploiement : **Vercel** (`npm run vercel:deploy`) — pas Hostinger pour le flux actuel

---

## Commandes utiles

| Commande | Rôle |
|----------|------|
| `npm run dev:local` | Dev stable 127.0.0.1:3001 |
| `npm run dev:clean` | Purge `.next` + cache |
| `npm run setup:local` | Install + DB + seed |
| `npm run db:sync` | Sync schéma Prisma |
| `npm run build` | Build production |
| `npx prisma generate` | Client Prisma (serveur arrêté) |
