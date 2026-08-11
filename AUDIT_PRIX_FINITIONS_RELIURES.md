# AUDIT — Prix Finitions & Reliures

Date : 2026-07-12  
Périmètre : Administration Finitions & Reliures + moteur POS / panier / devis

## Règles appliquées

| Famille | Règle |
|---------|--------|
| Coins arrondis | **50 Ar / feuille** — article `fin-coins` (retiré des types Découpe) |
| Collage | Simple A4 **100** · Contre-collage A4 **200** · A5=/2 · A3=×2 · **Dos carré retiré** |
| Couture oriflamme | Simple **5 000**/m² · Renforcée **10 000**/m² |
| Découpe | Droite **50**/pièce · Flex/couleur **10 000**/ml · Imprimé **10 000**/m² · Photobooth **75 000**/m² |
| Dorure | Standard/Texte/Logo/Motif **2/3/4/5 000** A4/face · conversion format + R/V |
| Pelliculage | A4 recto **600** · format × faces |
| Perforation | 1/2/4 trous **50/100/150** · pointillé **100**/A4 |
| Plastification | A4 **2 500** · recto = R/V |
| Pose autocollant | Petit **300**/pièce · GF ≤3 m **10 000**/m² · >3 m **20 000**/m² |
| Rainage | **100** × nb plis × facteur format |
| Spirale | 6 mm **3 000** · +**1 000**/cran |
| Piqûre | min **500** |
| Dos carré collé | min **5 000** · cousu **+5 000** (min 10 000) |
| Vernis | A4 recto **5 000** · format × faces |
| Personnalisation libre | prix manuel POS |

## Tables / fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `lib/finition/finition-price-catalog.ts` | Catalogue canonique + lignes Admin |
| `lib/finition/finition-pricing.ts` | Moteur calcul |
| `lib/finition/finition-formats.ts` | Conversion A4 + parse chip « A4 — … » |
| `lib/finition/finition-normalize.ts` | Conserve dim rainage |
| `lib/data/config-types/products/finitions.ts` | Options POS (sans coins dans découpe, sans dos carré collage) |
| `lib/data/catalogue.ts` | `prixDepart` + SPIRALES/PIQURES/DCC |
| `lib/services/finishing-admin-backfill.service.ts` | Seed Admin `FinishingPrice` |
| `lib/server/modules/direct-sale/pricing-table-handlers.ts` | Auto-backfill + `seed-from-pos` |
| Pages / embed Finitions | Bouton « Compléter Finitions depuis catalogue » |
| `tests/finition-prix-metier.test.ts` | Tests acceptation |

**Note modèles Prisma :** `FinishingPrice` reste la table centrale (pas de suppression). Les références spirale sont aussi des lignes `FinishingPrice` (`FIN-SPIRALE-*`). `FinishingPriceRule` / `BindingReferencePrice` / `FinishingFormatConversionRule` = logique TS + catalogue (extensible DB ultérieurement sans casser l’existant).

## Doublons / nettoyage options

- Retiré **« Coins arrondis »** des types Découpe → `fin-coins` uniquement  
- Retiré **« Dos carré »** des types Collage → reliure  
- Catalogue Admin : **aucune** ligne Bob / textile / carte / flyer  

## Tests prix (vitest)

Tous les cas du prompt §21 couverts dans `tests/finition-prix-metier.test.ts`.

## Impact POS / panier / devis

- `calculate.ts` → `applyFinitionArticlePricing` (déjà branché)  
- Chips POS mis à jour (complexité dorure, surface couture, formats rainage/collage)  
- Sync Admin → POS via `syncAllFinishingToPos` après backfill  

## Corrections « prix plus justes » (pass 2)

| Problème | Correctif |
|----------|-----------|
| Moteur dynamique court-circuitait `fin-*` avec anciens `prixBase` + paliers | `fin-*` = moteur dédié (`articleHasDedicatedPricingEngine`) |
| Remise volume générique (ex. qty 100) cassait 100×50=5000 | Remise volume = **0** pour finitions (serveur + POS) |
| Remises volume reliure masquaient les prix spirale | Remises reliure désactivées — prix référence exact |
| Bases pelliculage/vernis/etc. héritaient d’anciens `prixDepart` | Bases = **catalogue métier** (`FINITION_BASE_PRICES`) |
| Lien Admin « prix manquant » | Redirige vers `/administration/finitions-reliures` |

## Utilisation

1. `/administration/finitions-reliures` → **Compléter Finitions depuis catalogue**  
2. Vérifier/ajuster prix inline ou Excel  
3. **Sync POS**  
4. Tester POS : coins 100 feuilles = 5 000 Ar total (100 × 50)  
