# Backoffice — Règles de synchronisation des données

## Chaîne source de vérité

```
Backoffice (édition) → Brouillon DB / config admin → Publication → POS / Devis futurs
```

## Modèles concernés

- `ArticlePricingProfile` — profil tarifaire article
- `ProductOptionGroup` / `ProductOptionValue` — variables & options POS
- `ConfigVersion` — snapshot publié (historique)
- `SalePrice2026`, `FormulaVersion` — grilles & formules

## Règles

1. **Données affichées** : toujours depuis Prisma (jamais mock)
2. **Modification** : sauvegarde immédiate en brouillon ; statut `draft` tant que non publié
3. **Publication** (`POST /api/backoffice/publish`) : propage vers config effective POS
4. **Sync catalogue** (`POST /api/backoffice/sync`) : catalogue TS → profils DB manquants
5. **Devis existants** : conservent `configSnapshot` / prix figés
6. **Nouveaux devis** : moteur `resolvePrice` + contexte dynamic **publié**
7. **Après sauvegarde** : refresh catalogue API + badge « Modifié non publié »
8. **Anomalies** : rescan via `scanPricingAnomalies` à chaque chargement catalogue

## Statuts sync affichés

| Statut | Signification |
|--------|---------------|
| Synchronisé | Tous profils publiés, POS aligné |
| Modifié non publié | Profils en brouillon |
| Données incomplètes | Prix ou options manquants |
| Erreur | Échec sync / drift critique |

## Invalidation cache

Publication et sync invalident les caches KPI dashboard (`invalidateKpiCaches`).
