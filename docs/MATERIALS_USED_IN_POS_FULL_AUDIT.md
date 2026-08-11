# Matières utilisées dans le POS — audit

> Rapport structurel. Données live via `GET /api/admin-backoffice/pricing/materials-used-pos`.

## Sources auditées

| Source | Description |
|--------|-------------|
| `material-compat-official.ts` | Matières officielles compatibilité |
| `impression-sf-material-catalog.ts` | ISF petit format |
| `MaterialCatalog` / `GrammageCatalog` | DB normalisée |
| `SalePrice2026.material` | Import legacy (référence, pas calcul) |
| `ProductOptionValue` | Chips matière/support/grammage |
| Catalogue `CATALOGUE` | Familles textile |

## Règle d’anomalie

Toute matière détectée dans le POS **doit exister** dans `BaseMaterial` (onglet Matières de base).

## Colonnes rapport API

- Matière, famille, grammage, format, unité
- Articles liés, sources
- Prix actuel, prix manquant
- Anomalies (absence DB, prix manquant, incohérence visibilité)

## Action recommandée

1. Backoffice → **Matières de base** → Sync catalogue
2. Compléter prix achat + prix impression sans finition
3. Publier (`publicationStatus: published`)
4. Configurer **Prix base sans finition** par article
5. Publier profils dynamiques

Voir aussi : `docs/PRIX_2026_REMOVAL_AUDIT.md`, `docs/BASE_PRINTING_PRICE_LOGIC.md`.
