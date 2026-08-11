# Audit complet — bugs, synchronisation, interactivité

**Date :** 2026-07-03  
**Périmètre :** Phases 0–9, refonte Login/RH, modules stock & clients, dev-preview, data-quality  
**Tests :** `npm run test` (972+), build local validé hors verrou Prisma

---

## Synthèse

| Zone | Statut | Action |
|------|--------|--------|
| Gate RH (retard) | Corrigé | Fail-closed client + retry UI |
| KPI stock | Corrigé | Stats globaux vs liste filtrée |
| Clients recherche | Corrigé | Debounce 300 ms + loading refetch |
| Clients KPI CRM | Corrigé | Summary dédié + refresh après mutations |
| API data-quality | Corrigé | Envelope `{ ok, data: { …, rules, trend } }` |
| Login iframe preview | Corrigé | `_preview=1` : bannière + submit désactivé |
| Hub dev-preview auth-ui | Corrigé | Lien « Données mock » masqué |
| Import mort stock.repository | Corrigé | Suppression `applyTextSearchWhere` inutilisé |
| Doc Phase 9 | Corrigé | Retrait export `searchContains` inexistant |

---

## P0 — Gate RH (`LateArrivalGate`)

**Problème :** En cas d’erreur réseau ou HTTP sur `GET /api/rh/late-arrival`, le gate passait en `clear` → accès application sans vérification ni déclaration.

**Correction (`components/auth/late-arrival-gate.tsx`) :**
- États explicites : `loading | clear | error | success | blocked`
- `loading` → rendu `null` (pas de flash)
- Erreur GET / catch → `status: 'error'` avec overlay, message et bouton **Réessayer**
- POST : parsing via `getApiErrorMessage` (plus de message générique)
- Champs serveur conservés : `poste`, `departement`, `currentTime`

**Note serveur :** Le fallback `{ blocked: false }` dans la route API sur erreur interne reste intentionnel (Phase 1) ; le client ne fail-open plus sur erreur transport.

---

## P1 — Stock KPI vs filtres

**Problème :** `total`, `critical`, `outOfStock` étaient calculés sur la liste filtrée (recherche / catégorie / critique).

**Correction (`lib/server/modules/stock/stock.service.ts`) :**
- Double requête : tous les actifs + liste filtrée
- KPI sur `allActive`, items retournés filtrés séparément

**Test :** `tests/stock-list-stats.test.ts`

---

## P1 — Clients synchronisation

**Problèmes :**
1. Recherche sans debounce → requêtes à chaque frappe
2. `loading` non remis à `true` au refetch
3. Summary CRM rechargé à chaque changement `clients.length` (désync + charge inutile)

**Corrections (`app/(app)/clients/page.tsx`) :**
- `useDebounce(search, 300)` pour l’API
- `setLoading(true)` en tête de `fetchClients`
- `refreshCrmSummary()` au mount et après create / archive / restore / merge / réclamation
- Effet summary découplé de la longueur de liste filtrée

---

## P1 — POST retard erreurs API

**Correction :** `getApiErrorMessage` dans `LateArrivalGate.submit` pour afficher le message serveur.

---

## P2 — API data-quality

**Problème :** `rules` et `trend` étaient au niveau racine, panels attendent `data`.

**Correction (`app/api/admin/data-quality/route.ts`) :**
```json
{ "ok": true, "data": { …report, "rules": [...], "trend": [...] } }
```

Compatible avec `readApiJson` / `unwrapApiData` existants.

---

## P2 — Login mode aperçu iframe

**Problème :** `_preview=1` dans `auth-ui-preview` sans effet sur la page login embarquée.

**Correction (`app/login/page.tsx`) :**
- Détection `_preview=1` au mount
- Bannière info « saisie interactive, connexion désactivée »
- Submit et quick-login masqués ; champs restent interactifs
- Hint test local masqué en preview

---

## P2 — Hub dev-preview

**Correction (`components/dev-preview/module-view.tsx`) :**
- Module `auth-ui` : pas de lien « Données mock » (doublon)
- CTA unique « Aperçu UI → »

---

## P3 — Nettoyage

- `stock.repository.ts` : import mort supprimé
- `docs/PHASE_9_PERFORMANCE_REPORT.md` : ligne `searchContains` retirée

---

## Points validés (sans changement)

- Wiring RH : service → API → gate → `OrionEmployeeDelayCard`
- Refonte Orion Auth (composants `components/orion/auth/*`)
- Stock : recherche serveur multi-champs + debounce 300 ms côté page
- Monitoring `StockItem.label` (Phase 9)
- Monitoring Phase 8 (Sentry opt-in, `/api/health/ready`)
- 972 tests Vitest verts avant ajout `stock-list-stats`

---

## Vérifications recommandées

```bash
npm run typecheck
npm run test
npm run build   # arrêter le dev server si EPERM Prisma
```

**Manuel :**
1. `/dev-preview/auth-ui` — iframe login, bannière preview, pas de connexion
2. `/stock` — KPI stables pendant recherche
3. `/clients` — debounce recherche, KPI après création client
4. Login employé en retard — gate bloquant ; couper réseau → écran erreur + retry

---

## Fichiers modifiés (audit)

```
components/auth/late-arrival-gate.tsx
lib/server/modules/stock/stock.service.ts
lib/server/modules/stock/stock.repository.ts
app/api/admin/data-quality/route.ts
app/(app)/clients/page.tsx
app/login/page.tsx
components/dev-preview/module-view.tsx
tests/stock-list-stats.test.ts
docs/PHASE_9_PERFORMANCE_REPORT.md
docs/FULL_AUDIT_SYNC_REPORT.md
```
