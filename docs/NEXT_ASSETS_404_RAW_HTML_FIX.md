# Correction — Chunks Next.js 404 & affichage HTML brut

Date : juillet 2026 · Port local : **http://127.0.0.1:3020**

## Symptômes

- Page sans CSS/JS (liens bleus, sidebar cassée)
- `GET /_next/static/chunks/main-app.js` → **404**
- `GET /_next/static/css/app/layout.css` → **404**
- HTML initial **200** mais assets statiques introuvables

## Cause racine identifiée

**Désalignement cache `.next` entre `next build` et `next dev`.**

Quand `npm run build` (ou `npx next build`) s’exécute puis `npm run dev:local` **sans purger** `.next` :

- Le dossier `static/chunks/` contient des fichiers **hashés prod** (`1025.f0b737d5a834f0f5.js`)
- `next dev` sert du HTML référençant des chunks **dev** (`main-app.js`, `app/(app)/layout.js`)
- Ces fichiers n’existent pas → 404 en cascade → rendu brut

Ce n’est **pas** un bug Tailwind, sidebar, ni middleware bloquant les assets (les pages répondent 200).

## Corrections appliquées

| Fichier | Correction |
|---------|------------|
| `scripts/ensure-dev-next.mjs` | **Nouveau** — détecte cache prod résiduel, purge auto |
| `scripts/run-local.mjs` | Appelle `ensureDevNextReady()` avant `next dev` |
| `package.json` | Scripts `clean:next`, `rebuild:local` |
| `middleware.ts` | Matcher explicite excluant `api`, `_next`, fichiers statiques |
| `next.config.js` | Déjà OK — pas d’`assetPrefix`/`basePath` en dev |
| `components/dev-boot-recovery.tsx` | Déjà présent — unregister SW + reload asset 404 |

## Procédure immédiate (obligatoire une fois)

**1. Arrêter le serveur dev** (Ctrl+C dans le terminal `npm run dev:local`)

**2. Purger et relancer**

```powershell
cd "C:\Users\ans\Documents\ANS CRM V3"
npm run clean:next
npm run dev:local
```

Ou :

```powershell
npm run dev:local:clean
```

**3. Navigateur**

- Ouvrir http://127.0.0.1:3020/administration/backoffice?tab=pricing-custom
- **Ctrl+Shift+R** (hard refresh)
- Fermer les onglets sur d’anciens ports (3000, 3010…)

## Prévention automatique

Désormais, `npm run dev:local` **purge automatiquement** `.next` si des chunks hashés prod sont détectés sans `main-app.js`.

## Tests de validation

- [ ] `main-app.js` → 200
- [ ] `layout.css` → 200
- [ ] Design sombre ANS ORION visible
- [ ] `/administration/backoffice?tab=pricing-custom` OK
- [ ] `/dashboard`, `/pos`, `/commandes` OK
- [ ] Aucune redirection auth sur `/_next/*`

## Commandes utiles

| Commande | Usage |
|----------|--------|
| `npm run dev:local` | Dev avec garde-fou cache |
| `npm run clean:next` | Purge `.next` + prisma generate |
| `npm run dev:local:clean` | Purge complète + dev |
| `npm run rebuild:local` | Purge + build production |

## À ne pas faire

- Ne pas lancer `next build` puis `next dev` sans purge intermédiaire
- Ne pas supprimer `.next` **pendant** que le serveur tourne
- Ne pas mélanger `next start` (prod) et `next dev` sur le même `.next`
