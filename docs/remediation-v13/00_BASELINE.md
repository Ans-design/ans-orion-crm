# V13 — Baseline KPI / Cockpits (revalidée post-implémentation)

**Date :** 2026-08-02  
**Provider DB local :** SQLite (`prisma/dev.db`) — prod cible PostgreSQL  

## Commandes baseline

```bash
node scripts/v13-kpi-inventory.mjs
npx vitest run tests/v13-kpi-foundation.test.ts tests/cockpit.test.ts \
  tests/dashboard-fallback.test.ts tests/kpi-live-aggregates.test.ts --reporter=dot
```

## Inventaire AST (recalculé 2026-08-02 soir)

| Métrique | Valeur |
|----------|--------|
| Fichiers scannés | ~2068 |
| Fichiers catch→0/[] | ~30 (hors path dashboard critique partiellement migré) |
| Routes API stats | 11 |
| Surfaces UI KPI | 17 |

Artefact : `artifacts/remediation-v13/kpi-inventory.json`

## Suite Vitest

**Foundation V13 + cockpit + fallback + live aggregates : PASS** (20 tests observés sur suite ciblée).

| Test | Décision |
|------|----------|
| BusinessClock / envelope / registry | **PASS** — contrat Lot 2 |
| dashboard-fallback zéros | **PASS** avec `kpiMeta.quality: NO_DATA` |
| cockpit CM / stock | **PASS** |

## État livré (vs baseline initiale)

| Item baseline | Après V13 |
|---------------|-----------|
| Pas de `lib/kpi/` | **Présent** (clock, envelope, registry, permissions, invalidation) |
| `beneficeNet` trompeur | Alias deprecated + `caMoinsChargesMois` |
| `* 50000` | **Supprimé** (`coutErreursStatus: NOT_APPLICABLE`) |
| Magasin → production | **Profil `magasin`** |
| Conducteur `94` | **NOT_APPLICABLE** rendement cible |
| Accueil non-lus | **par userId** + carte UI |
| Logistique COUNT vs MGA | **Séparé** (`facturesImpayeesCount` / `resteAEncaisserMga`) |
| BusinessClock | **Branché** dashboard + cockpit day start |
| Watermark | Fichier `data/kpi-watermark.json` + outbox handlers |

## Timezone

Défaut métier : `Indian/Antananarivo`.
