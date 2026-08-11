# Audit Options / Chips — Articles & Variables ANS ORION

Date : 2026-07-05  
Onglet : `/administration/backoffice?tab=chips`

## Symptôme

- Panneau ARTICLES : « Aucun article trouvé »
- Panneau central vide
- Panneau détail vide

## Fichiers inspectés

| Fichier | Rôle |
|---------|------|
| `components/backoffice-v2/options/OptionsChipsWorkspace.tsx` | Orchestrateur UI |
| `components/backoffice-v2/options/OptionsArticlesList.tsx` | Liste articles (message vide) |
| `components/backoffice-v2/options/ChipsDataTable.tsx` | Tableau variables |
| `lib/server/modules/backoffice-v2/admin-backoffice-chips.service.ts` | Logique métier |
| `app/api/admin-backoffice/articles/route.ts` | API legacy articles |
| `app/api/admin-backoffice/options/articles/route.ts` | API corrigée |
| `lib/data/catalogue.ts` + `catalogue-meta.ts` | Catalogue POS statique (95 articles) |
| `lib/data/config-types/` | Sections/champs POS (source variables) |
| `prisma/schema.prisma` | `ArticlePricingProfile`, `ProductOptionGroup`, `ProductOptionValue` |

## Modèles Prisma utilisés

- **ArticlePricingProfile** — profil prix par article (`articleId` unique)
- **ProductOptionGroup** — groupe variable/champ (`fieldKey`, impacts, section)
- **ProductOptionValue** — valeur chip (`priceModifier`, `label`)

Relations : `ArticlePricingProfile` → `optionGroups[]` → `values[]`

## Sources réelles des données

| Donnée | Source primaire | Fallback |
|--------|-----------------|----------|
| Liste articles POS | `POS_CATALOGUE` (95 articles) | Profils DB orphelins |
| Variables/chips | `ProductOptionGroup` + `ProductOptionValue` | `config-types` via `extractOptionGroups()` |
| Ancien onglet (supprimé UI) | `admin-config` JSON `config.chips` | Non utilisé par v2 |

## Cause exacte — « Aucun article trouvé »

1. **`listChipArticles()` ne lisait que `ArticlePricingProfile`** — table souvent vide en local avant sync dynamic-pricing.
2. **Le catalogue POS (95 articles) n'était pas fusionné** — les articles existent dans `lib/data/catalogue.ts`, pas uniquement en DB.
3. **Le front attendait `d.data` comme tableau** — la nouvelle API renvoie `{ articles, stats }` ; parsing incomplet possible.

## Cause exacte — panneau central vide

1. `getArticleChips()` retournait `null` si pas de profil DB.
2. Sans profil → aucune variable affichée, même si `config-types` contient les sections/champs POS.

## Corrections appliquées

1. Fusion **POS_CATALOGUE + ArticlePricingProfile + compteurs DB + config-types**.
2. `getArticleChips()` : DB d'abord, complété par config-types (IDs `seed::articleId::fieldKey`).
3. `getGlobalChips()` : DB + fallback config pour articles sans groupes DB.
4. APIs `/api/admin-backoffice/options/*` + rétrocompat legacy.
5. UI : diagnostics, réinitialisation filtres, compteurs header.
6. `patchChipGroup()` : matérialise en DB les variables catalogue au premier PATCH.

## Risques

| Risque | Mitigation |
|--------|------------|
| Double source DB / config | Dédup par `fieldKey`, DB prioritaire |
| Volume vue globale (~4600+ lignes) | Limite 2000 + pagination future |
| PATCH sur seed | `ensureDbGroupFromSeed()` crée le groupe Prisma |
| POS cassé | Aucune suppression ; mêmes modèles Prisma |

## Tests manuels recommandés

1. `/administration/backoffice?tab=chips` — 95 articles visibles
2. Sélectionner `pkg-hangtag` — ~37 variables par blocs
3. Vue globale — milliers de lignes
4. Toggle indicatif / impact prix — exclusivité
5. `npm run build`
