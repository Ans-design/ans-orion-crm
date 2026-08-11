# Phase 9 — Performance / recherche

**Date :** 2026-06-24  
**Statut :** Intégré  
**Périmètre :** Recherche SQL unifiée SQLite/PostgreSQL, stock serveur, indexes.

---

## Objectif

Réduire les scans inutiles et déporter la recherche côté serveur sur les modules à fort volume, avec une API compatible **SQLite local** et **PostgreSQL prod**.

---

## Module recherche (`lib/server/search/text-search.ts`)

| Export | Rôle |
|--------|------|
| `normalizeSearchTerm` | Trim, min 2 car., max 120 car. |
| `buildTextSearchOr` | OR Prisma multi-champs via `containsQ` |
| `applyTextSearchWhere` | Helper champs racine (stock, etc.) |

S'appuie sur `lib/prisma-filters.ts` → `mode: 'insensitive'` en PostgreSQL.

---

## Repositories migrés

| Module | Champs recherche |
|--------|------------------|
| **Clients** | name, email, code, tel, nif |
| **Commandes** | numero, article, client (name/tel/whatsapp/code) |
| **Devis** | numero, client.name |
| **Stock** | sku, label, paperType, grammage, supplier |

Les requêtes d'1 caractère ne déclenchent plus de `LIKE` SQL.

---

## Stock — recherche serveur

- `GET /api/stock?search=` — filtre Prisma (plus de filtre client JS)
- Page **Stock** : debounce 300 ms (`useDebounce`) → API
- Index Prisma : `@@index([label])` + migration `20260702150000_stock_label_search_index`

---

## Patterns existants conservés

- `parseListParams` / `API_LIST_MAX_LIMIT = 100`
- `useWindowedRows` pour listes ≥ 60 lignes (Phase 6)
- `dynamic()` backoffice, dashboard slices parallèles

Voir aussi `docs/PERFORMANCE.md`.

---

## Tests

- `tests/text-search.test.ts` — normalisation + builders
- Suite complète à exécuter après merge

---

## Vérifications

```bash
npx prisma validate
npm run typecheck
npm run test
```

**Manuel :** `/stock` → taper un SKU → résultats après 300 ms sans recharger toute la liste en mémoire.

---

## Prochaine étape — Phase 10

DevOps / release / Vercel / checklist rollback.
