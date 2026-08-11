# POS Pricing Engine — Cible 10/10

## Architecture actuelle

```
POS UI → /api/pos/article/[id]/pricing-config
      → pricing-engine.service.ts
      → calculate.ts (chemins legacy SF/PLV/global)
      → BaseMaterial (published) + BasePrintingPrice + Options + Tiers
```

## Sortie moteur requise

```typescript
{
  total: number;
  lines: Array<{ label, amount, source, version? }>;
  warnings: string[];
  anomalies: string[];
  snapshot: object; // pour devis
}
```

## Chemins de calcul

| Priorité | Source | Fichier | Statut |
|---:|---|---|---|
| 1 | BasePrintingPrice published | `base-printing-price.service.ts` | ✅ Actif |
| 2 | BaseMaterial + formule | `pricing-engine.service.ts` | ✅ Actif |
| 3 | Options impact prix | `option-chip pricing` | ✅ |
| 4 | Paliers article | `tiers` workspace | ✅ |
| 5 | Impression SF grid | `impression-sf-pricing.ts` | ⚠️ Legacy grid |
| 6 | PLV grid | `plv-pricing.ts` | ⚠️ Legacy grid |
| 7 | Global pricing | `global-pricing.ts` | ⚠️ Fallback |
| 8 | prixDepart catalogue | `catalogue.ts` | ⚠️ Fallback UI |
| — | SalePrice2026 DB | `sale-price-service.ts` | ❌ Désactivé |

## Règles métier

1. Variable `impactsPrice: false` → **ne modifie jamais** le total
2. Variable `impactsStock: true` → vérifie stock avant panier
3. Publication requise avant impact POS opérationnel
4. Prix max = garde-fou (`maxSafetyPrice`)

## Plan migration 10/10

### Phase A — Traçabilité (S)

- Afficher `source` + `publicationVersion` dans synthèse panier
- Logger calcul dans snapshot devis

### Phase B — Éliminer fallbacks (M)

- Migrer familles SF papier → `BasePrintingPrice` par article
- Désactiver chemin `impressionSfTarif` quand DB couvre 100%

### Phase C — Unification (L)

- Un seul entrypoint `computePosPrice(articleId, config, qty)`
- Tests golden par article (95 références)

## Tests existants

- `tests/pricing-engine-materials.test.ts`
- `tests/pos-server-pricing-sync.test.ts`
- `tests/pos-price-impact.test.ts`
- `tests/prix-2026-legacy.test.ts`

## KPI succès

- 0 appel `lookupSalePrice2026` en prod
- 100% articles POS avec prix base published ou formule explicite
- Écart simulateur backoffice vs POS < 0.01 Ar
