# 01 — Architecture Audit

## Synthèse

ANS ORION suit une architecture Next.js 14 App Router avec ~39 domaines sous `lib/server/modules/` et une couche legacy `lib/services/` (80+ fichiers). Le hub métier est la **commande** (`commandes/`). Le backoffice est la **source de configuration** ; le POS consomme les versions **publiées**.

## Écarts vs cible ultraprompt

| Domaine cible | État | Fichiers clés |
|---|---|---|
| `crm/` | ❌ Absent — `clients/` seulement | `lib/server/modules/clients/` |
| `pos/` | ⚠️ Minimal module | `lib/pos/`, `lib/services/pricing.service.ts` |
| `pricing/` | ✅ Riche | `lib/server/modules/pricing/*` |
| `orders/` | ✅ `commandes/` | `commandes.service.ts` |
| `production/` | ✅ `productions/` + API | `app/api/production/` |
| `stock/` | ✅ Complet récent | `stock.service.ts`, `sku-generator.service.ts` |
| `purchases/` | ⚠️ Thin — validation only | `lib/services/purchase-order-service.ts` |
| `suppliers/` | ⚠️ Thin | `supplier-dedup.service.ts`, `app/api/suppliers/` |
| `finance/` | ⚠️ Split `factures/` + `paiements/` | `lib/services/finance.service.ts` |
| `hr/` | ✅ `rh/` | 10+ services |
| `auth/` | ⚠️ Hors modules | `lib/auth.ts`, `middleware.ts` |
| `backoffice/` | ✅ v1 + v2 | `backoffice-v2/*` |
| `audit/` | ⚠️ Dispersé | `lib/audit.ts`, `audit-log.service.ts` |
| `notifications/` | ⚠️ Minimal | `notifications.service.ts` |
| `shared/` | ❌ Absent | Cross-cutting dans `lib/services/` |

## Problèmes prioritaires

### P1 — Double couche services

- **Problème :** Logique métier dupliquée entre `lib/server/modules/` et `lib/services/`
- **Fichiers :** `lib/server/sync/commercial-flow.ts` (`MODULE_SERVICE_MAP`)
- **Impact :** Drift sync, maintenance difficile
- **Correction :** Migrer progressivement vers modules ; garder `lib/services/` comme façade deprecated
- **Effort :** L (plusieurs sprints)
- **Régression :** Moyenne — tests sync existants
- **Test :** `tests/sync-drift.test.ts`, `tests/ultra-prompt-services.test.ts`

### P1 — React avec logique prix

- **Problème :** Certains composants POS/backoffice calculent ou affichent prix sans passer par API
- **Fichiers :** `components/pos/*`, `lib/pricing/calculate.ts` (côté serveur OK)
- **Impact :** Incohérence affichage vs facturation
- **Correction :** Tout calcul via `pricing-engine.service.ts` + snapshot devis/commande
- **Effort :** M
- **Test :** `tests/pricing-engine-materials.test.ts`, `tests/pos-server-pricing-sync.test.ts`

### P2 — Pas de module `shared/` validators/DTO

- **Correction :** Créer `lib/server/modules/shared/` pour parseOr400, erreurs API, types communs
- **Effort :** S

## Architecture cible (rappel)

```
Pages → Composants → Hooks/API fetch → Route handlers → Services → Repository → Prisma
Backoffice (config) → Publication → POS/Devis (snapshots) → Commande (hub) → Production/Stock/Finance
```

## Références

- `docs/ARCHITECTURE.md`
- `docs/SYNC_MATRIX.md`
- `docs/FLOW_GLOBAL.md`
