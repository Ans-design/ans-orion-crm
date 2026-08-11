# Refonte tarification Matières DB — rapport

**Date :** 2026-07-05  
**Ultraprompt :** `ULTRAPROMPT_LOGIQUE_PRIX_MATIERES_BASE_SUPPRIMER_PRIX_2026_ANS_ORION`

## Livré (vague 1 + intégration complète)

### Intégration POS / publication / CI
- `scripts/seed-base-materials-pricing.ts` + `npm run seed:base-materials`
- CI : `ci-seed-drift.ts` appelle le seed matières automatiquement
- `publish-bulk` publie aussi matières + prix base
- `POST .../pricing/sync-pos` : catalogue + matières DB publiées
- `dynamic-engine` injecte `BasePrintingPrice` publié dans `prixBase`
- POS `pricing-config` expose `basePrintingPrices` + `usesPrix2026Legacy`

### Composants UI intégrés
- `ArticleBasePricePanel` + `FormulaAuditPanel` dans fiche article Prix & Calculs
- `MaterialsPricingWorkspace` onglet Matières de base

### APIs complètes ultraprompt
- materials-used-pos, base-materials, base-printing (GET/POST/PATCH)
- articles/:id/materials, base-price (GET/PATCH), formula-audit
- pricing/anomalies, pricing/audit-log

### PRIX 2026 retiré du calcul actif
- `lib/pricing/prix-2026-legacy.ts` — flag `USE_PRIX_2026_LEGACY` (défaut off)
- `lib/pricing/calculate.ts` — gate + priorité `basePrintingNoFinish` avant legacy
- Onglet backoffice renommé **PRIX 2026 (archive)** + bannière legacy

### Modèles Prisma
- `BaseMaterial` — matières de base modifiables
- `BasePrintingPrice` — prix impression sans finition par article

### Services
- `base-material.repository.ts` / `base-material.service.ts`
- `base-printing-price.service.ts`
- `materials-used-pos.audit.ts`
- `pricing-formula-audit.service.ts`
- `pricing-anomaly.service.ts`

### APIs
- `GET materials-used-pos`, `base-materials`, `PATCH base-materials/:id`
- `GET base-printing`, `PATCH base-printing/:id`
- `GET articles/:id/base-price`, `formula-audit`
- `GET pricing/anomalies` (étendu)

### UI Backoffice
- `BaseMaterialsTable`, `MaterialsUsedPosTable`, `BasePrintingPriceTable`
- `MaterialsPricingWorkspace` — onglet Matières de base
- Intégration **Prix & Calculs** (vue globale + fiche article)

### Docs
- `PRIX_2026_REMOVAL_AUDIT.md`
- `MATERIALS_USED_IN_POS_FULL_AUDIT.md`
- `BASE_PRINTING_PRICE_LOGIC.md`
- `CUSTOM_PRICING_WITH_MATERIALS_DB.md`
- `POS_PRICING_SYNC_WITH_MATERIALS_DB.md`

### Tests
- `tests/prix-2026-legacy.test.ts`

## Prochaines étapes

1. `npx prisma db push` / migration en CI pour tables `BaseMaterial`, `BasePrintingPrice`
2. Seed initial : Sync catalogue → remplir prix base → publier
3. Migrer les 95 articles vers profils publiés (remplacer fallback `prixDepart`)
4. Peupler `BasePrintingPrice` depuis audit matières POS
5. Composants restants ultraprompt : `FormulaAuditPanel`, `PricingSimulationPanel`, `PricingDiffPosPanel` dédiés
6. E2E backoffice matières (23 scénarios ultraprompt)

## Validation

- `npm run typecheck` ✅
- Tests unitaires ciblés ✅
- Build complet : lancer après `prisma generate` (fermer dev server si EPERM Windows)
