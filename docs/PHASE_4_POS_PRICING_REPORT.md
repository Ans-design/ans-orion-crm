# Phase 4 — POS / Prix / Panier / Devis (intégration)

**Date :** 24 juin 2026  
**Projet :** ANS CRM V3 / ANS ORION  
**Précédent :** [PHASE_3_DATABASE_PRISMA_REPORT.md](./PHASE_3_DATABASE_PRISMA_REPORT.md)

---

## Résumé

Phase 4 **intègre** la décision « zéro aperçu visuel » dans le POS opérationnel : synthèse texte enrichie, bannière champs manquants actionnable, découpage des composants configurateur, nettoyage des chemins preview morts. **Pas d’audit seul** — code livré et testé.

**Flag inchangé :** `ENABLE_PRODUCT_PREVIEWS = false` (`lib/pos/features.ts`).

---

## 1. Correctifs intégrés

### Synthèse de configuration (remplace l’aperçu)

| Fichier | Rôle |
|---------|------|
| `lib/pos/configuration-summary.ts` | **Nouveau** — construction centralisée des lignes (produit, catégorie, champs prioritaires, surface, quantité, prix, manquants) |
| `components/pos/pos-configuration-summary.tsx` | UI « Synthèse de configuration » + ligne « Manquant : … » |
| `components/pos/pos-missing-fields-banner.tsx` | Liste courte inline + liens scroll vers `#pos-field-{key}` |

Champs prioritaires dans la synthèse : format, matière, grammage, finition, reliure, couleur, quantité, surface, options métier.

### Découpage configurateur POS

| Composant | Extrait de |
|-----------|------------|
| `components/pos/product-configurator-header.tsx` | `app/(app)/pos/[id]/page.tsx` |
| `components/pos/product-pricing-panel.tsx` | `pos-summary-content.tsx` |
| `components/pos/add-to-cart-action-bar.tsx` | `pos-summary-content.tsx` |

`PosSummaryContent` délègue tarification et actions — fichier allégé (~130 lignes en moins).

### Suppression chemins preview UI

| Fichier | Changement |
|---------|------------|
| `components/article-preview.tsx` | `return null` si `!ENABLE_PRODUCT_PREVIEWS` |
| `components/pos-preview/ProductPreviewCard.tsx` | Déjà `null` si flag false |
| `components/pos-preview/ProductPreviewEngine.tsx` | `return null` (wrapper, hooks OK) |
| `app/(app)/pos/page.tsx` | Suppression fetch `productPreviews` / `previewOverrides` |
| `components/pos/pos-catalog-grid.tsx` | Grille texte seule (pas de prop preview) |
| `components/panier/cart-item-card.tsx` | Déjà specs texte (Phase précédente) |

Registre preview 95 produits **conservé** (admin, validation) — **non rendu** en UI.

---

## 2. Flux métier vérifié (code)

```
CRM (client sélectionné) → POS configurateur → synthèse + prix
  → Panier (UserPreference + API /api/cart envelope Phase 2)
  → Devis (cart-service → prisma.devis + DevisLigne)
  → Commande / Facture (checkout existant, non modifié)
```

- Panier : `hooks/use-cart.ts` + `unwrapApiData` (Phase 2)
- Affichage panier : `getCartItemDisplayFields` / `getCartItemConfigSummary`
- Prix serveur : `articleUsesUnifiedServerPricing` + policies existantes (**règles tarifaires non modifiées**)

---

## 3. Tests exécutés

```powershell
npm run typecheck                    # OK
npm run test                         # 959/959 OK (+3 configuration-summary)
npm run validate:pos-previews        # PASS (95 produits)
npx prisma validate                  # OK
```

Build : arrêter `npm run dev` si `prisma generate` verrouille le query engine, puis `npm run build`.

---

## 4. Fichiers modifiés / créés

**Créés**

- `lib/pos/configuration-summary.ts`
- `components/pos/product-configurator-header.tsx`
- `components/pos/product-pricing-panel.tsx`
- `components/pos/add-to-cart-action-bar.tsx`
- `tests/configuration-summary.test.ts`
- `docs/PHASE_4_POS_PRICING_REPORT.md`

**Modifiés**

- `components/pos/pos-configuration-summary.tsx`
- `components/pos/pos-missing-fields-banner.tsx`
- `components/pos/pos-summary-content.tsx`
- `app/(app)/pos/[id]/page.tsx`
- `app/(app)/pos/page.tsx`
- `components/pos/pos-catalog-grid.tsx`
- `components/article-preview.tsx`

---

## 5. Critères Phase 4

| Critère | Statut |
|---------|--------|
| Aucun aperçu produit visible (flag false) | **OK** |
| Synthèse claire (texte structuré) | **OK** |
| Champs manquants listés + scroll | **OK** |
| Panier / devis (code path intact + API Phase 2) | **OK** |
| Prix (pas de changement moteur) | **OK** |
| 95 produits registry validé | **OK** |
| Composants POS découpés (header, pricing, actions) | **OK** |
| Tests / typecheck | **OK** |

---

## 6. Suite manuelle recommandée

Tester en local (`npm run dev:local`) sur familles :

- Grand format (bâche, rollup)
- Petit format (flyer, carte)
- Livret / reliure
- Textile / goodies
- Finition standalone

Parcours : configurer → synthèse → panier → devis.

---

## 7. Suite plan 10 phases

**Phase 5 — Design system Orion** (`components/orion/`)

---

**Phase 4 : VALIDÉE (intégration code)** — prêt pour **Phase 5**.
