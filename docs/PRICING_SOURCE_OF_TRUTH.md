# Source de vérité tarifaire ANS ORION

## Architecture cible

```text
Backoffice configure → publication atomique → DB stocke
  → service tarifaire canonique (lib/pricing/canonical-tariff-service.ts)
  → POS / devis / commande / GPAO / exports consomment
```

## Modes

| Environnement | Comportement |
|---------------|--------------|
| staging / production | STRICT — tarif manquant = erreur métier ; pas de `prixDepart` ; pas d’Excel |
| local + `ALLOW_DEMO_PRICING_FALLBACK=true` | Démo explicite (bannière POS) — fallback catalogue possible |
| local sans flag | Pas de `prixDepart` ; moteurs DB / dédiés uniquement |

## Cartographie des sources (2026-08-05)

| Source | Runtime ? | Bundle ? | Env |
|--------|-----------|----------|-----|
| `ArticlePricingProfile` / `FormulaVersion` published | **Oui** | N/A (DB) | tous |
| `SalePrice2026` / grilles Admin Int | **Oui** | N/A | tous |
| Moteurs dédiés (ISF, GF, carterie, PLV DB…) | **Oui** | code | tous |
| `lib/data/prix-2026-grids` | **Stubs null** | stubs only | — |
| `archives/pricing/prix-2026-grids` | **Non** (archive) | Ignored webpack | scripts/audit |
| `catalogue.prixDepart` | Démo only | catalogue TS | local+flag |
| `FINITION_BASE_PRICES` | Archive constants ; STRICT = overrides Admin only | code | STRICT zeros |
| PLV hardcodes | `getEffectivePlv*` → 0 en STRICT | code | STRICT |
| `priceModifier` legacy | Dual avec `priceAddonAr` | DB | tous |

## Publication

- Article : `publishArticleDynamicPricing` — versionnée, user, horodatée, draft→published→archived
- Globale : `publishPricingRelease` — snapshot hashé, pointeur actif, rollback = nouvelle version
- Cache : `invalidatePricingRuntimeCache` à chaque publish / notifyAdminModuleMutation
- Publication partielle : profil reste `draft` → POS ne consomme pas (sellable checks)

## API POS

`POST /api/pos/price-preview` → `resolveCanonicalTariff` (pas Excel, erreur 422 si manquant).

## Tests anti-régression

- `tests/remediation-pricing-architecture.test.ts`
- `tests/prix-2026-runtime-stub.test.ts`

## ANO mapping (ne pas marquer FIXED sans preuve)

| ID | Statut attendu après cette passe |
|----|----------------------------------|
| ANO-XLS / PRX-01 | PARTIALLY_FIXED → archive hors runtime + stubs ; E2E prod **NOT_TESTED** |
| ANO-PLV-LOCAL / PRX-04 | FIXED_VERIFIED STRICT ; hors STRICT encore legacy constants |
| ANO-MODIFIER / FIN-MODIFIER | FIXED_VERIFIED local (money phase) |
| ANO-BO-POS / PRX-02 | **FIXED_VERIFIED** — E2E BO→POS 22 passed ×3 ; `reports/E2E_BACKOFFICE_POS_EVIDENCE.md` |
