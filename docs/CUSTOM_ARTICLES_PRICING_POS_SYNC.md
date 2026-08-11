# Synchronisation POS — Prix personnalisés

## Flux

```
Modification Backoffice (brouillon)
  → sauvegarde Prisma
  → badge « X modification(s) non publiée(s) »
  → publication (article ou globale)
  → version publiée
  → POS / panier / nouveau devis
```

## Endpoints

| Action | Route |
|--------|-------|
| Publier config globale | `POST /api/admin-backoffice/pricing/publish` |
| Sync catalogue → DB | `POST /api/admin-backoffice/pricing/sync-pos` |
| Publier article | `POST /api/dynamic-pricing/[articleId]` `{ "action": "publish" }` |
| Publier paliers | `PATCH /api/admin-backoffice/tiers/articles/[id]` `{ "action": "publish" }` |

## POS lit uniquement le publié

- Formules : `FormulaVersion.status = published`
- Profil : `ArticlePricingProfile.status = published`
- Paliers : tiers actifs du contexte publié
- Chips visibles : `visiblePos` + valeurs actives (draft chips pour preview POS via overrides)

## Diff Backoffice vs POS

`GET /api/admin-backoffice/pricing/articles/[articleId]/diff-pos`

Compare brouillon (`loadDraftDynamicContext`) vs publié (`loadPublishedDynamicContext`).

## Snapshots

Devis/commandes existants : **jamais recalculés** après publication.  
Nouveaux devis : snapshot au moment de la création via `resolvePrice()`.
