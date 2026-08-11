# POS Price Impact Rules — Rapport technique

Date : 2026-07-04  
Lot : Correction Impact Prix POS + Paiement Commande

## Source de vérité

| Fichier | Rôle |
|---------|------|
| `lib/pos/variable-price-impact.config.ts` | Table déclarative des règles globales et par article/famille |
| `lib/pricing/price-impact-rules.ts` | Résolveur runtime (règle > défaut > override manuel backoffice) |
| `lib/pricing/config-to-dynamic-pricing.ts` | Seeding dynamique — `impactsPrice` / `isInformational` pilotés par le résolveur |
| `lib/pricing/sync-dynamic-pricing.ts` | Sync catalogue — préserve les overrides manuels |
| `lib/pricing/update-article-pricing.ts` | PATCH backoffice — persiste `manualPriceImpactOverride` |

## Règles globales descriptives

Champs neutralisés par défaut (tous articles sauf exception tarifaire explicite) :

- `remarques`, `note`, `notes`, `details`, `detail`, `precisions`
- `orientation`
- `aspect`, `aspect_oeillets`, `couleur_support`, `couleur_dos`

## Exceptions figées

| Règle | Portée | Champs |
|-------|--------|--------|
| Goodies couleur | catégorie `goodies` | `couleur` — **jamais tarifaire** |
| Bloc-note produit | préfixe `bn-` | `produit` |
| Livres type | `bk-livres` | `type` |
| PLV chevalet / oriflamme | `plv-chevalet*`, `plv-oriflamme` | `type` (descriptif ; dimensions via format/spec) |
| Finitions | `fin-pelliculage`, `fin-vernis`, `fin-dorure`, `fin-coins` | type/procédé/sélection coins |
| Doypack | `pkg-doypack` | `matiere`, `couleur_doypack` |
| Photo / event / document | articles dédiés | selon config |

## Perforation legacy

- Champ `nb_perforations` **retiré** du configurateur (`FIN_PERFORATION` dans `config-types.ts`).
- Lecture historique conservée via `LEGACY_PERFORATION_FIELDS` dans `cart-config-display.ts`.

## Neutralisation legacy (calculateurs hors moteur dynamique)

| Module | Changement |
|--------|------------|
| `lib/grand-format/bache-rules.ts` | Coefficient `aspect` retiré du calcul prix |
| `lib/pricing/plv-pricing.ts` | Supplément `PLV_TYPE_SUPPLEMENT` ignoré pour chevalet et oriflamme |
| `lib/finition/finition-pricing.ts` | `cornerRounding` n’alimente plus le multiplicateur coins |

## Backoffice

- UI pricing moderne : `components/admin/article-pricing-inline-sections.tsx`
- Toggle **Impacte le prix** / **Descriptif**
- Badge runtime : `Impact prix` | `Descriptif` | `N’impacte pas le prix`

## Tests

- `tests/price-impact-rules.test.ts` — résolveur, PLV legacy, badges synthèse, paiement
- `tests/dynamic-pricing-seed.test.ts` — signature `extractOptionGroups(articleId, sections)`
- `tests/stock-rule-production.test.ts` — idem

## Validation

```bash
npm run typecheck
npx prisma validate
npm run test -- tests/price-impact-rules.test.ts
npm run build
```
