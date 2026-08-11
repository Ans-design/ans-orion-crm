# AUDIT — Calcul prix Flyers

Date : 2026-07-12  
Périmètre : Catalogue POS Commercial (`fly-std`) + Administration Catalogue, Prix & Stock

## Formule appliquée

```
prixFlyer =
  prixImpressionSansFinition(format, matière, grammage, face, qty)
  + prixPliage(nbPlis × prixPliA4 × coeffFormat)
  − remisePalierISF(qty)   si UTILISE PALIER = oui
```

| Élément | Règle |
|---------|--------|
| Base impression | `computeImpressionSfPrice` — **aucune** grille Flyer dupliquée |
| 1 volet | 0 pli → pliage = 0 |
| 3 volets | 2 plis |
| Prix pli A4 | **100 Ar** (Finitions rainage / Admin Flyer) |
| Coeff A5 / A4 / A3 | 0,5 / 1 / 2 |
| Remise | Paliers volume ISF (pas de `priceTiers` fixes Flyer) |

## Sources

| Source | Rôle |
|--------|------|
| Impression sans finition | Prix matière / grammage / format / face / qty |
| Finitions & Reliures (`FIN-RAINAGE-PLI`) | Prix pli A4 (aligné runtime Flyer) |
| Paliers ISF | Remise quantité |
| `FLYER_REGLES_PRIX` (SystemConfig) | Matrice volets→plis + flags Admin |

## Fichiers modifiés / créés

| Fichier | Rôle |
|---------|------|
| `lib/pricing/flyer-pricing.ts` | Moteur ISF + pliage |
| `lib/pricing/flyer-pricing-rules.ts` | FlyerPricingRule + Excel columns |
| `lib/services/flyer-pricing-sync.service.ts` | Persist SystemConfig + sync rainage |
| `lib/pricing/calculate.ts` | Branche `flyerIsfPliage` + snapshot `flyerNote` |
| `lib/pos/pos-price-policy.ts` / `server-pricing-policy.ts` | Moteur dédié `fly-*` |
| `lib/data/config-types/products/flyers.ts` | `priceTiers: []` |
| `lib/data/flyer-material-catalog.ts` | Offset +70g |
| `app/api/admin-backoffice/pricing/flyer-regles/route.ts` | API Admin CRUD / Excel |
| `components/administration/pricing-rules/FlyerPricingWorkspace.tsx` | UI Admin |
| `app/(app)/administration/flyer-regles/page.tsx` | Route Admin |
| Catalogue Prix & Stock onglet **Flyers** | Hub CPS |
| `app/(app)/pos/[id]/page.tsx` + `product-pricing-panel.tsx` | Détail impression + pliage |
| `lib/pricing/pricing-anomalies.ts` | Anomalies Flyer |
| `tests/flyer-pricing.test.ts` | Tests acceptation |

## Tests effectués

```
npx vitest run tests/flyer-pricing.test.ts
```

Cas couverts :
1. 1 volet → 0 pli / 0 Ar  
2. A4 3 volets → 200 Ar pliage  
3. A3 4 volets → 600 Ar pliage  
4. Config incomplète → `missingField`  
5. Matrice Excel sans duplication ISF  

## POS — affichage

- Prix impression / pièce  
- Pliage / pièce (nb plis)  
- Quantité, remise ISF, total HT  
- Si donnée manquante : « Prix en attente — champ manquant : … »

Panier / devis : snapshot `flyerPricing` + `flyerNote` transmis via moteur unifié.

## Administration

- `/administration/catalogue-prix-stock?tab=flyers`  
- `/administration/flyer-regles`  
- Liens vers ISF, Finitions rainage, Paliers  
- Export / import feuille `FLYER_REGLES_PRIX`

## Anomalies détectées (scanner)

- Flyer sans source ISF  
- Pliage sans prix A4  
- Volets / plis incohérents  
- Flyer non synchronisé POS  

## Anomalies restantes / suites

| Point | Statut |
|-------|--------|
| Grammages « plages » 90–135 / 135–180 (libellés) | Discrete g existants ISF — pas de table Flyer séparée |
| Formats commerciaux ≈ cm dans chips Flyer | Dédoublonnage global format (autre chantier) |
| Migration Prisma `FlyerPricingRule` | Non créée — SystemConfig + FinishingPrice suffisent (zéro duplication ISF) |
| Smoke POS navigateur avec grille ISF réelle | À valider en local après `ensureImpressionSfRuntimeReady` |

## Critères d’acceptation

| # | Critère | Statut |
|---|---------|--------|
| 1 | Base ISF | OK |
| 2 | Format / matière / grammage / face / qty | OK (via ISF) |
| 3–5 | Volets → plis | OK (tests) |
| 6–7 | 100 Ar / A3×2 | OK (tests) |
| 8 | Paliers | OK (ISF + flag Admin) |
| 9–10 | Détail POS / panier | OK (snapshot) |
| 11–12 | Admin + Excel | OK |
| 13 | Pas de duplication ISF | OK |
| 14 | Sync Admin → POS | OK (runtime + rainage) |
| 15 | Build | Vitest OK ; `npm run build` bloqué EPERM (preview:local lock Prisma) — relancer build après arrêt serveur |
