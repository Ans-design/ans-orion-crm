# Tarification personnalisée — Matières DB

## Chaîne

```
Backoffice Matières de base (BaseMaterial)
  → Prix base sans finition (BasePrintingPrice)
  → Variables impact prix (ProductOptionGroup)
  → Formule publiée (FormulaVersion)
  → Paliers (DiscountTier)
  → Publication
  → POS (profil publié + prix base)
  → Panier / Devis (snapshot)
  → Commande (snapshot figé)
```

## Modèles Prisma

- `BaseMaterial` — matière, grammage, prix achat, prix imp. sans finition, prix max, marges
- `BasePrintingPrice` — par article/matière/format/face
- `MaterialCatalog` / `MaterialPrice` — compatibilité existante
- `ArticlePricingProfile` — profil dynamique draft/published

## UI Backoffice

| Écran | Route |
|-------|-------|
| Matières de base | `?tab=materials` |
| Prix & Calculs | `?tab=pricing-custom` |
| PRIX 2026 archive | `?tab=prices2026` |

## Règle absolue

**PRIX 2026 = legacy.** Calcul POS via `USE_PRIX_2026_LEGACY` (défaut: off).
