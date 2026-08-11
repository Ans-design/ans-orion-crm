# 08 — Backoffice Admin Audit

## Structure actuelle

**Shell principal :** `app/(app)/administration/backoffice/page.tsx` → `AdminBackofficeShell`

**26 sections URL** (`lib/administration/routes.ts`) — trop dispersées vs cible 11 hubs.

## Workspaces backoffice v2

| Workspace | Composant | État 10/10 |
|---|---|---|
| Options / Chips | `OptionsChipsWorkspace` | ✅ Recherche, toggles, tri |
| Paliers | `TiersWorkspace` | ✅ Par article |
| Prix personnalisés | `MaterialsPricingWorkspace` | ✅ Fusion matières+prix |
| Matières & prix base | `BaseMaterialPricesTable` | ✅ Éditable, publication |
| Prix & calculs | `PricingCustomWorkspace` | ⚠️ Simulateur à renforcer |
| Sync | Centre synchronisation | ✅ Drift audit |

## Organisation cible (ultraprompt §6)

1. Vue globale — santé, brouillons, anomalies
2. Articles & prix — 95 articles POS
3. Options / Chips
4. Matières & prix de base ✅
5. Paliers / remises ✅
6. Prix & calculs
7. Stock lié
8. Versions / publication
9. Accès / rôles
10. Anomalies
11. Audit log

## Problèmes

| ID | Problème | Priorité | Correction |
|---|---|---|---|
| BO-01 | 26 sections vs 11 hubs | P1 | Regrouper menu sidebar |
| BO-02 | Vue globale incomplète | P1 | Dashboard santé + actions rapides |
| BO-03 | Audit log non unifié UI | P2 | Page `/administration/historique` |
| BO-04 | Rollback publication | P2 | Versioning matières |
| BO-05 | Legacy onglets prix 2026 | P3 | Masqué `showLegacy` ✅ |

## Publication workflow

```
Édition → draft → validation → publish → POS/devis
```

- Compteur brouillons matières ✅
- Publish all ✅
- Invalidation cache KPI ✅

## Design

- `admin-backoffice.css` — 1900+ lignes tokens tables/chips/mp
- Switches `ab2-toggle` ✅
- Éviter card-in-card — en cours sur legacy sections
