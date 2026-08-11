/**
 * AUDIT — Règles prix événementiel / photo / papier / grand format / POS
 * Date : 2026-07-11
 *
 * Objectif : tracer l’implémentation des règles métier (Admin → DB → POS),
 * sans prix hardcodés figés dans React.
 */

## Synthèse

| Domaine | Statut | Notes |
|--------|--------|-------|
| Équivalences Offset 70/100 | OK | `MaterialPriceEquivalence` + seed + Excel OPÉRATION/VALEUR AR |
| Promo Affiche / Calendrier plateau −40 % | OK | `ArticlePromotionalRule` + moteur `event-pricing` |
| Badge (PVC/A4÷n + marge + découpe) | OK | Params Admin `EventPricingParam` |
| Billet / Carte de vœux A4/n | OK | `computeA4DivisionPrice` commun |
| Bracelet = type + technique | OK | `EventAccessoryPrice` |
| Lanyard = modèle seul | OK | Technique sans impact prix |
| Chèque cadeau sans Offset | OK | Config POS + `isGiftCardMaterialAllowed` |
| Limites formats × matière | OK | `MaterialFormatLimit` + chips grisés POS |
| Enveloppe / Fanion / Pochette / Photobooth / Photocall / Comptoir | PARTIEL | Formules + seeds accessoires ; prix m² GF via config/sync |
| Import/Export Excel tables | PARTIEL | Équivalences OK ; nouvelles tables via API sync + seed |
| `pricingRulesSyncService` | OK | `lib/services/event-pricing-sync.service.ts` |

## Fichiers clés

- `lib/pricing/event-pricing.ts` — moteur
- `lib/pricing/event-accessories.ts` — composants Admin
- `lib/pricing/material-format-limits.ts` — limites formats
- `lib/pricing/material-equivalence-rules.ts` — Offset 70/100
- `lib/services/event-pricing-sync.service.ts` — sync + verify
- `lib/pricing/calculate.ts` — branchement POS
- `prisma/schema.prisma` — `ArticlePromotionalRule`, `MaterialFormatLimit`, `EventAccessoryPrice`, `EventPricingParam`

## Tests unitaires (`tests/event-pricing-rules.test.ts`)

| Test | Attendu | Résultat |
|------|---------|----------|
| Offset 70G = 80G − 20 | 400 → 380 | OK |
| Offset 100G supplément +50 vs 90 | 420 → 470 | OK |
| Affiche PCB A4 1500 −40 % | 900 | OK |
| Badge 13000/8 +10% +50 | 1838 | OK |
| Billet 148×52 = A4/8 +50 | 238 | OK |
| Billet + QR | 288 | OK |
| Glossy bloque A2 | non autorisé | OK |
| PVC opaque bloque A3 | non autorisé | OK |
| Offset autorise A0 | autorisé | OK |
| Plexiglass bloque > 2400×1200 | non autorisé | OK |
| Chèque refuse Offset | non autorisé | OK |
| Enveloppe C4 invitation + cire | 3400 | OK |

**Vitest : 21/21 OK** (`tests/event-pricing-rules.test.ts`)

## Critères d’acceptation

1. **Règles en base** — modèles Prisma créés ; seed idempotent au démarrage sync.
2. **Modifiables Admin/Excel** — équivalences via `/administration/equivalences-matieres` ; params/accessoires via tables Event* (API sync).
3. **Pas de prix figés POS** — moteurs lisent runtime/DB/seeds Admin.
4. **POS formules** — `calculatePrice` priorise `eventPricing` pour `evt-*` / `cal-plateau`.
5. **Formats incompatibles grisés** — `isFormatAllowedForMaterial` sur chips format.
6. **Promo spécifique article** — ne modifie pas ISF global.
7. **Hybrides** — enveloppe / fanion / pochette / comptoir / photocall additionnent composants.
8. **Persistance F5** — DB Prisma + invalidation runtime après sync.
9. **Anciens seeds** — Offset 70/100 upsertés sans écraser valeurs Admin déjà modifiées.

## Suite recommandée

1. Pages Admin dédiées (Règles promo, Limites formats, Bracelets, Enveloppes…) calquées sur `MaterialRulesWorkspace`.
2. Brancher prix m² Grand Format réels pour Photobooth / Photocall / Comptoir / Chèque PVC.
3. Audit log écriture sur chaque import Excel Event*.
4. `npx prisma db push` + `npx prisma generate` en local avant démo.

## Commandes vérif

```bash
npx vitest run tests/event-pricing-rules.test.ts
# après db push :
node -e "require('./lib/services/event-pricing-sync.service').verifyPricingConsistency().then(console.log)"
```
