# Correction aperçu local — HTML brut / CSS / chunks 404

Date : juin 2026  
Port stable : **http://127.0.0.1:3020**

---

## Symptômes

- Page sans design (HTML brut)
- `GET /_next/static/chunks/*.js` → **404**
- `GET /_next/static/css/app/layout.css` → **404**
- Parfois `/_next/static/chunks/fallback/*.js` → **500**
- Bannière terminal indiquant un port différent du serveur réel

---

## Cause racine

Ce n’est **pas** un problème de design Tailwind ou de sidebar. C’est un **désalignement entre le HTML servi et les assets compilés** par Next.js.

Causes fréquentes observées :

| Cause | Mécanisme |
|-------|-----------|
| Cache `.next` obsolète | Hashes de chunks changés, navigateur demande d’anciens fichiers |
| Suppression de `.next` / `node_modules` **pendant** que le serveur tourne | Le dev server répond mais ne trouve plus les chunks |
| Port incohérent (3010 vs 3020) | Onglet ouvert sur un ancien port avec HTML en cache |
| `npm run dev -- -p XXXX` sans nettoyage | Mélange build précédent + nouveau port |
| Override webpack (historique) | Cassait les chemins `/_next/static/…` — **supprimé** |

Aucun service worker / PWA actif dans ce projet (`public/manifest.json` seul).

---

## Fichiers corrigés

| Fichier | Correction |
|---------|------------|
| `next.config.js` | Pas de `assetPrefix`/`basePath` en dev ; `output` uniquement en prod |
| `middleware.ts` | Matcher exclut tout `/_next/` |
| `app/layout.tsx` | Port metadata `3020` |
| `app/providers.tsx` | `DevBootRecovery` (SW unregister + reload asset 404) |
| `components/dev-boot-recovery.tsx` | **nouveau** |
| `app/error.tsx` | **nouveau** — erreurs hors groupe `(app)` |
| `scripts/run-local.mjs` | Port par défaut **3020** |
| `scripts/print-local-banner.mjs` | Aligné port **3020** |
| `scripts/dev-clean.mjs` | Purge `.next`, `.turbo`, caches npm/prisma |
| `package.json` | `dev:local:clean` |
| `.env.local.example` | `HOST`, `PORT`, URLs `127.0.0.1:3020` |

---

## Procédure de nettoyage (Windows PowerShell)

**1. Arrêter tous les serveurs Node**

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process prisma -ErrorAction SilentlyContinue | Stop-Process -Force
```

**2. Purger les caches**

```powershell
cd "C:\Users\ans\Documents\ANS CRM V3"

Remove-Item -Recurse -Force ".\.next" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".\.turbo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".\node_modules\.cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".\node_modules\.prisma" -ErrorAction SilentlyContinue

npm cache clean --force
```

**3. Régénérer Prisma et lancer**

```powershell
npx prisma generate
npm run dev:local
```

Ou en une commande :

```powershell
npm run dev:local:clean
```

**4. Navigateur**

- Ouvrir **http://127.0.0.1:3020** (pas `localhost:3000`, pas l’ancien port)
- **Ctrl+Shift+R** (hard refresh)
- Fermer les onglets sur d’anciens ports

---

## Commandes

| Commande | Usage |
|----------|--------|
| `npm run dev:local` | Dev stable `127.0.0.1:3020` |
| `npm run dev:local:clean` | Purge cache + dev |
| `npm run dev:clean` | Purge seule |
| `npm run build` | Validation production |

Diagnostic : **http://127.0.0.1:3020/dev-health**

---

## Vérifications

- [ ] CSS chargé (pas de HTML brut)
- [ ] Aucun 404 sur `/_next/static/chunks`
- [ ] Aucun 404 sur `/_next/static/css`
- [ ] `/dev-health` OK
- [ ] Sidebar + thème clair/sombre OK
- [ ] `npm run build` OK

---

## À ne pas faire

- Ne pas taper `http://…` dans PowerShell (ce n’est pas une commande)
- Ne pas supprimer `node_modules` ou `.next` pendant que `next dev` tourne
- Ne pas mélanger `next start` (prod) et `next dev` sur le même `.next` sans `dev:clean`
- Ne pas ajouter d’override `webpack.output.filename` dans `next.config.js`
