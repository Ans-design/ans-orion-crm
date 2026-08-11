# AUDIT — Fusion logique Stock & Matières + Prix & Calculs

Date : 2026-07-11

## Objectif

Une matière = une seule fiche (`BaseMaterial`).  
Ses prix selon usage = `MaterialContextPrice` (contexte).  
Prix & Calculs = règles uniquement.  
ISF / Grand Format / AVD = **vues**, pas des copies indépendantes.  
POS = `pricingResolver` → moteurs existants.

## Architecture livrée

| Couche | Implémentation | Rôle |
|--------|----------------|------|
| Source matières | `BaseMaterial` | Stock & Matières |
| Prix contextuels | `MaterialContextPrice` | PRINT_SMALL_FORMAT, PRINT_GRAND_FORMAT, RAW_STOCK, BLANK_MATERIAL… |
| Profils articles | `ProductPricingProfile` | Mode prix AVD (DIRECT / MATERIAL / GF / HYBRID) |
| Liens vues | `BasePrintingPrice.baseMaterialId`, `GrandFormatPricing.baseMaterialId` | Traçabilité |
| Resolver | `lib/pricing/pricing-resolver.ts` | API unique POS/Admin |
| Sync / migration | `lib/services/pricing-data-sync.service.ts` | Migrate, drift, merge, rebuild |
| Hub Admin | `/administration/base-prix-matieres` | Onglets overview / anomalies / sync |

## Règle anti-doublon

1. Modifier prix dans Stock & Matières → `BaseMaterial` + `MaterialContextPrice` (+ BPP lié si présent).
2. Modifier prix dans Impression SF → `BasePrintingPrice` + sync vers matière / contexte (via patch unifié + migration).
3. Lookup POS : **MaterialContextPrice d’abord**, puis BPP legacy.

## UI — pas un mega-tableau

Hub avec liens vers les vues métier existantes :
- Matières & Stock → `/administration/matieres`
- Petit format → `/administration/impression-sf`
- Grand format → `/administration/grand-format-prix`
- AVD → `/administration/articles-vente-directe`
- Règles → équivalences / promo / limites / paliers
- Anomalies → détection doublons + bouton « Fusionner les doublons »

## Tests

| Test | Résultat |
|------|----------|
| Contextes prix exposés | OK |
| API pricingResolver complète | OK |
| Promo n’altère pas prix base matière | OK |
| Limites format via resolver | OK |
| API pricingDataSyncService | OK |

Fichier : `tests/pricing-fusion-architecture.test.ts`

## Critères d’acceptation

| Critère | Statut |
|---------|--------|
| Stock & Matières = source principale | OK (`BaseMaterial`) |
| ISF n’est plus copie indépendante (lien + contexte) | OK (partiel : migration à lancer) |
| GF lié à matière | OK (`baseMaterialId` + sync) |
| AVD → ProductPricingProfile | OK (sync) |
| Prix & Calculs = règles | OK (pas de nouveaux prix matières dans règles) |
| POS via pricingResolver | OK (lookup BPP priorise contexte) |
| Excel métier inchangé côté UX | OK (écritures → tables centrales via sync) |
| Doublons détectables / fusionnables | OK (hub anomalies) |
| Audit | Ce fichier |

## Actions Admin après déploiement

1. `npx prisma db push` + `npx prisma generate`
2. Ouvrir `/administration/base-prix-matieres` → **Migrer vers source unique**
3. Vérifier onglet **Anomalies / Doublons**
4. Si doublons : **Fusionner les doublons**
5. Contrôler POS Offset / PCB / PVC après F5

## Suite recommandée

- Édition inline ISF qui force toujours `upsertMaterialContextPrice` même sans `baseMaterialId` (création matière auto).
- Import Excel ISF/GF → écrire uniquement MaterialContextPrice + BaseMaterial (déprécier écriture orpheline).
- Afficher badge « source : Stock & Matières » sur les écrans vue ISF/GF.
