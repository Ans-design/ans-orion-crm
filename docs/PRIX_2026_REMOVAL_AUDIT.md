# PRIX 2026 — Audit de retrait

> Généré dans le cadre de la refonte tarification Matières DB (2026-07).

## Décision

**PRIX 2026 ne doit plus être source de calcul.** Conservé en archive legacy lecture seule / migration.

## Mécanisme de retrait

| Couche | Fichier | Action |
|--------|---------|--------|
| Flag legacy | `lib/pricing/prix-2026-legacy.ts` | `USE_PRIX_2026_LEGACY=true` pour réactiver temporairement |
| Moteur | `lib/pricing/calculate.ts` | `lookupSalePrice2026ForArticle` gated — priorité après profil dynamique et prix base sans finition |
| POS resolve | `lib/pricing/ans-price-store.ts` | Passe par `calculatePrice` (hérite du gate) |
| Backoffice UI | `AdminBackofficeShell` onglet `prices2026` | Bannière « Legacy — non utilisé pour calcul » |
| Anomalies | `lib/pricing/pricing-anomalies.ts` | Message brouillon → Matières DB |

## Fichiers concernés (calcul actif — à ne plus utiliser)

### Moteur
- `lib/pricing/calculate.ts` — fallback `salePrice2026` (gated)
- `lib/services/sale-price-service.ts` — lookup DB `SalePrice2026`
- `lib/pricing/ans-price-store.ts` — admin CRUD + resolve
- `lib/data/impression-sf-paper-tariffs.ts` — grilles statiques source PRIX_2026.xlsx
- `lib/data/plv-tariffs.ts` — idem
- `lib/finition/finition-pricing.ts` — remises volume réf. PRIX 2026

### APIs
- `/api/pricing/calculate`, `/api/pos/pricing`, `/api/price-store/resolve`
- `/api/fusion/sale-prices` — édition archive (ne doit plus alimenter POS)
- `/api/dynamic-pricing/[articleId]` — action `migrate-from-2026`

### UI
- `components/admin/pricing-v4/*` — panneaux PRIX 2026
- `components/backoffice-v2/AdminBackofficeShell` — onglet archive
- `components/admin/fusion-admin-panels.tsx` — grille ANS_PRICE_STORE

### DB
- `SalePrice2026` (~1140 lignes) — **conservé**, non supprimé (zéro suppression)
- `PriceHistory` — traçabilité

## Nouvelle source de vérité

1. **Matières de base** — `BaseMaterial` (Prisma) + UI `BaseMaterialsTable`
2. **Prix base impression sans finition** — `BasePrintingPrice` + `lookupPublishedBasePrintingPrice`
3. **Profils dynamiques publiés** — `ArticlePricingProfile` + `dynamic-engine.ts`
4. **Paliers** — `DiscountTier` après sous-total

## Risques & mitigation

| Risque | Mitigation |
|--------|------------|
| Article sans profil publié et sans prix base | Anomalies backoffice + fallback `prixDepart` / sur devis |
| Anciens devis/commandes | Snapshots `_pricingSnapshot` inchangés |
| Migration incomplète | Onglet archive + comparateur migration existant |

## Plan sans régression

1. ✅ Gate PRIX 2026 (`USE_PRIX_2026_LEGACY` off by default)
2. ✅ Tableaux Matières de base + prix base sans finition
3. Publier profils dynamiques article par article
4. Remplir `BaseMaterial` / `BasePrintingPrice` depuis audit matières POS
5. Validation POS + snapshots devis
