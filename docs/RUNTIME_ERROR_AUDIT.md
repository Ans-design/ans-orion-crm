# Audit runtime — écran « Error » 127.0.0.1

Date : 24 juin 2026  
Projet : **ANS ORION CRM V3** (Next.js 14.2.28)

---

## Symptôme

Après démarrage local (`next dev`), le navigateur affichait une page noire minimale :

```
Error
127.0.0.1:3001
```
(ou `:3010` selon le port utilisé)

Le serveur répondait (HTTP 200/307), mais l’interface authentifiée ne se rendait pas. L’écran générique masquait la cause réelle.

---

## Vraie erreur identifiée

**`useSearchParams()` dans `OrionSidebar` sans boundary `<Suspense>`.**

Next.js 14 App Router impose qu’un composant client appelant `useSearchParams()` soit enveloppé dans `<Suspense>` lorsqu’il est rendu dans l’arbre layout (ici via `app-shell.tsx` sur **toutes** les pages authentifiées).

Sans cela, Next lève une erreur de type **CSR bailout** (`missing-suspense-with-csr-bailout`) qui se manifeste côté navigateur par l’écran noir générique « Error » + hostname — **pas** par `app/(app)/error.tsx` (le layout parent échoue avant).

### Fichier responsable

| Fichier | Rôle |
|---------|------|
| `components/layout/orion-sidebar.tsx` | `useSearchParams()` ligne ~47 |
| `app/(app)/_components/app-shell.tsx` | Monte la sidebar sur chaque page `(app)` |

La page `/messagerie` avait déjà un `<Suspense>` local ; la sidebar globale, non.

---

## Corrections appliquées

### 1. Suspense autour de la sidebar (fix principal)

- **Nouveau** `components/layout/orion-sidebar-suspense.tsx`  
  - `OrionSidebarSuspense` + `OrionSidebarDrawerSuspense` avec fallback skeleton.
- **`app/(app)/_components/app-shell.tsx`**  
  - Remplacement des imports directs par les wrappers Suspense.

### 2. Error boundaries — visibilité en développement

| Fichier | Changement |
|---------|------------|
| `app/global-error.tsx` | **Nouveau** — message, stack, digest en dev ; boutons Réessayer / Diagnostic / Connexion |
| `app/(app)/error.tsx` | `console.error('[app-error]', …)` ; message + stack visibles en `NODE_ENV === development` |
| `components/shared/orion-error-boundary.tsx` | Affiche `error.message` en dev au lieu d’un texte générique |

### 3. Garde défensive navigation

- `components/layout/sidebar/sidebar-universe-nav.tsx` — rendu conditionnel si `item.icon` absent (évite crash sur mapping icône undefined).

### 4. Port local stabilisé sur 3010

| Fichier | Changement |
|---------|------------|
| `package.json` | `"dev:local": "node scripts/run-local.mjs dev"` → port **3010**, hôte **127.0.0.1** |
| `scripts/run-local.mjs` | `PORT` défaut `3010` |
| `scripts/print-local-banner.mjs` | Bannière alignée sur `3010` |
| `app/layout.tsx` | `metadataBase` fallback `http://127.0.0.1:3010` |

### 5. Contexte antérieur (chunks/CSS 404)

Voir `docs/LOCAL_DEV_AUDIT.md` — suppression de l’override webpack dans `next.config.js` (cause des ChunkLoadError / HTML brut). **Non lié** à l’écran « Error » mais nécessaire pour un local stable.

---

## Pages testées

Commande serveur : `npm run dev -- -p 3010 -H 127.0.0.1` (ou `npm run dev:local`)

| Route | Résultat HTTP | Notes |
|-------|---------------|-------|
| `/login` | 200 | HTML complet, CSS/JS OK |
| `/dev-health` | 200 | Diagnostic Prisma OK |
| `/dev-preview` | 200 | Preview design OK |
| `/` | 307 → `/login` | Redirection attendue |
| `/dashboard` | 307 → `/login?reason=session_expired` | Compilation OK (3585 modules) |
| `/commandes` | 307 → login | Compilation OK |
| `/devis` | 307 → login | Compilation OK |
| `/messagerie` | 307 → login | Compilation OK (ANS Talk) |
| `/administration/vue-ensemble` | 307 → login | Redirect backoffice |
| `/rh/equipements` | 307 → login | Compilation OK |

**Assets statiques** (sur `/login`) :

- `/_next/static/css/app/layout.css` → **200**
- `/_next/static/chunks/webpack.js` → **200**
- `/_next/static/chunks/main-app.js` → **200**

> Routes `/communication/ans-talk` et `/administration/backoffice` n’existent pas en tant que telles ; équivalents : `/messagerie` et `/administration/vue-ensemble`.

---

## Build production

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
cd "C:\Users\ans\Documents\ANS CRM V3"
npm run build
```

**Résultat :** ✓ Compiled successfully — 101 pages générées (warnings ESLint hooks préexistants, non bloquants).

---

## Commandes recommandées (local)

```powershell
# Démarrage propre
npm run dev:clean
npm run dev:local

# Ou explicitement
npm run dev -- -p 3010 -H 127.0.0.1
```

Ouvrir dans le **navigateur** (pas PowerShell) : http://127.0.0.1:3010

---

## Critères de validation

| Critère | Statut |
|---------|--------|
| http://127.0.0.1:3010 accessible | ✓ |
| CSS/chunks sans 404 | ✓ |
| Compilation `/dashboard` sans crash Suspense | ✓ |
| `npm run build` passe | ✓ |
| Erreurs dev visibles (`global-error`, `app/error`, console) | ✓ |
| Shell authentifié après login | À confirmer côté utilisateur (session requise) |

---

## Si l’écran « Error » réapparaît

1. Console navigateur (F12) — chercher `missing-suspense-with-csr-bailout` ou stack React.
2. Terminal Next.js — ligne rouge au moment du GET de la route.
3. Vérifier tout nouveau `useSearchParams()` dans un layout/shell sans `<Suspense>`.
4. `npm run dev:clean` puis hard refresh (Ctrl+Shift+R).
5. Page diagnostic : http://127.0.0.1:3010/dev-health
