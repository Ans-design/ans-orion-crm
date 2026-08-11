# 06 — POS & Pricing Audit

## Flux officiel

```
Client → Article POS → Variables/Chips → Moteur prix → Panier → Devis (snapshot) → Commande
```

## Moteur de prix

**Fichier central :** `lib/server/modules/pricing/pricing-engine.service.ts`  
**Calcul legacy :** `lib/pricing/calculate.ts` (chemins impression SF, PLV, global-pricing)

### Ordre de calcul cible

1. Prix base matière / support / format / face
2. Quantité
3. Options impact prix
4. Finitions
5. Paliers / remises
6. Urgence / délai
7. Livraison
8. TVA
9. Total + détail + warnings

## PRIX 2026 — Statut

| Source | Actif ? |
|---|---|
| Table DB `SalePrice2026` | ❌ Désactivé (`USE_PRIX_2026_LEGACY` false) |
| Grilles `impression-sf-paper-tariffs.ts` | ⚠️ Oui — dérivées archive |
| Grilles `plv-tariffs.ts` | ⚠️ Oui — dérivées archive |
| Anomalie si source 2026 | ✅ `material-price-anomaly.service.ts` |

**P1 :** Migrer grilles SF/PLV vers BasePrintingPrice publié.

## Publication

- Matières : `publicationStatus` draft → published
- Articles dynamiques : `publish-dynamic-pricing.ts`
- Bulk : `publish-bulk` inclut matières ✅
- POS lit published : `pricing-pos-sync.service.ts`

## Problèmes

| ID | Problème | Priorité | Fichier |
|---|---|---|---|
| POS-01 | Variables sans impact modifient parfois l'UI prix | P1 | `components/pos/pos-summary-content.tsx` |
| POS-02 | `prixDepart` catalogue fallback si pas de formule | P2 | `lib/data/catalogue.ts` |
| POS-03 | Pas de version affichée dans synthèse panier | P2 | POS summary |
| POS-04 | Stock warning avant ajout panier partiel | P1 | `lib/pos/stock-check` |

## Tests

- `tests/pricing-engine-materials.test.ts` ✅
- `tests/pos-server-pricing-sync.test.ts` ✅
- `tests/prix-2026-legacy.test.ts` ✅
- `tests/pos-price-impact.test.ts` ✅

Voir aussi : [POS_PRICING_ENGINE_10_10.md](./POS_PRICING_ENGINE_10_10.md)
