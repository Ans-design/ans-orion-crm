# Sync POS — Matières DB

## Flux publication

1. Modifier matière ou prix base → `publicationStatus: draft`
2. Audit anomalies (`GET /api/admin-backoffice/pricing/anomalies`)
3. `POST /api/admin-backoffice/pricing/publish` ou publish-bulk
4. `POST /api/admin-backoffice/pricing/sync-pos`
5. POS lit profil **published** + `BasePrintingPrice` published

## Ce que le POS utilise

- ✅ `ArticlePricingProfile` status `published`
- ✅ `BasePrintingPrice` published
- ✅ `BaseMaterial` published (via moteur matière)
- ✅ `DiscountTier` published
- ✅ Variables `impactsPrice: true` uniquement
- ❌ PRIX 2026 (sauf flag legacy)
- ❌ Variables indicatives

## Snapshots

Devis/commandes conservent `_pricingSnapshot` — modification backoffice n’impacte pas l’historique.
