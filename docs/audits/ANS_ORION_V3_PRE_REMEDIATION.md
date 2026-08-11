# ANS ORION V3 — Pré-remédiation (avant toute modification métier)

**Date :** 2026-07-30  
**Racine :** `C:\Users\ans\Desktop\2em-export-complet-UNIQUE`  
**Git :** **absent** (pas de dépôt `.git`)

## Environnement

| Élément | Valeur mesurée |
|---------|----------------|
| Node | v24.15.0 |
| npm | 11.12.1 |
| Framework | Next.js 14 (package.json scripts) |
| ORM | Prisma 6.x · provider schema = **sqlite** (dev) |
| Lockfile | `package-lock.json` (npm) |
| AGENTS.md | absent |
| README | présent (`README.md`, `README_LOCAL.md`) |
| Règles Cursor | `.cursor/rules/*.mdc` |

## Bases (sans secrets)

| Contexte | Kind (sans URL) |
|----------|-----------------|
| Dev local (`.env.local`) | SQLite `file:` |
| E2E | `prisma/e2e.db` présent (~6 Mo) ; **pas** de `prisma/prisma/e2e.db` (fix V2 OK) |
| Prod | Postgres attendu Hostinger/Neon (scripts) |

## Sauvegarde locale ciblée

Dossier (hors compilés, hors `.env*`) :

`C:\Users\ans\Desktop\ANS_ORION_V3_BACKUP_20260730-094413`

Fichiers copiés avant édition (liste initiale P0/P1 sidebar) :

1. `lib/navigation/build-sidebar-universes.ts`
2. `components/administration/AdministrationMacroNav.tsx`
3. `components/layout/sidebar/sidebar-universe-nav.tsx`
4. `lib/navigation/sidebar-universes.ts`
5. `lib/modules/permission-matrix.ts`
6. `lib/page-access.ts`
7. `docs/MODULES_MAP.md`
8. `docs/USER_JOURNEYS.md`

Des fichiers supplémentaires seront sauvegardés dans le même dossier (sous-dossier horodaté) avant chaque lot.

## Fichiers métier prévus pour modification (lots P0→P1)

### Lot P0 — Sidebar Admin gate

- `lib/navigation/can-access-administration.ts` (**création**)
- `lib/navigation/build-sidebar-universes.ts`
- `components/administration/AdministrationMacroNav.tsx`
- `components/layout/sidebar/sidebar-universe-nav.tsx` (si badges parent)
- `tests/sidebar-admin-access.test.ts` (**création**)
- évent. `lib/modules/index.ts` (réexport)

### Lot P1 — Commercial flow

- `lib/navigation/sidebar-universes.ts`
- `components/layout/sidebar/sidebar-universe-nav.tsx`
- `styles/sidebar-modern.css` / tokens flow vs badge
- `tests/commercial-flow-nav.test.ts` (**création**)
- Décision métier Réclamations : **ne pas** ajouter permission sans validation humaine — recalcul étapes visibles

### Lot P1 — Docs macros / discoverabilité

- `docs/MODULES_MAP.md` (6→7 macros)
- `docs/USER_JOURNEYS.md`
- `docs/ADMIN_UI_PILES_MAP_2026-07-30.md` (si présent)
- `lib/administration/admin-macro-modules.ts` (organisation hub / modeles si applicable)

### Lots ultérieurs (après P0)

- Prix / stock / errors / typing / CSS / deps / E2E métier — listés dans la matrice au fur et à mesure

## Interdits respectés

- Pas de modification `.env*` secrets
- Pas d’opération Git destructive / pas de création git auto
- Pas de copie `node_modules`, `.next*`, secrets dans la sauvegarde
