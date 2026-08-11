# AUDIT — Suppression Bibliothèque options / Simulation / Versions

Date : 17 juil. 2026  
Réf. : `PROMPT_SUPPRESSION_BIBLIOTHEQUE_OPTIONS_SIMULATION_VERSIONS_ANS_CRM_V3.txt`

## Périmètre réalisé (UI Administration)

| Élément | Action | État |
|---------|--------|------|
| Onglet Simulation | Retiré de `PricingStudioNav` | Fait |
| Onglet Versions | Retiré de `PricingStudioNav` | Fait |
| Bibliothèque options | Retiré des sous-onglets Finitions | Fait |
| Deep-links `tab=simulation\|versions\|chips\|options` | Redirect → overview / finitions | Fait |
| CTAs « Tester un prix » / « Comparer versions » | Retirés du cockpit Studio Prix | Fait |
| Sous-titre Studio Prix | « Formules, tarifs et paliers appliqués automatiquement… » | Fait |
| Domaine « Options & finitions » | Renommé « Finitions & règles » | Fait |
| « Produits & publication » | Renommé « Produits & disponibilité » | Fait |
| Cockpit actions « Simuler / publier » | Remplacé par « Corriger un tarif » | Fait |

## Conservé techniquement (pas de perte POS)

- `pricingResolver` serveur + `/api/pricing/simulate` (non exposé en nav)
- Composants `PricingSimulatorPanel`, `PricingVersionsPanel`, `OptionsChipsEditor` (fichiers conservés, non branchés sur la nav métier)
- Modèle Prisma `FormulaVersion` + snapshots devis/commandes
- API chips `/api/admin-backoffice/options/chips` (KPI / POS)

## Matrice (synthèse)

| Élément | Données | Consommateurs | Nouvelle UI | Suppression UI | Code sûr à supprimer plus tard |
|---------|---------|---------------|-------------|----------------|--------------------------------|
| Bibliothèque options | OptionChip ~4 753 | POS, fiches produit | Finitions + dépendances + matières | Oui | Après script de classification |
| Simulation | — | Admin only | Aucune | Oui | Panel + routes UI uniquement |
| Versions tarifaires | FormulaVersion | POS projection | Enregistrer et appliquer (interne) | Oui | Panel UI uniquement |

## Suite réalisée (17 juil. 2026 — lot 2)

### Enregistrer et appliquer (Formules)

- Toolbar : **Enregistrer et appliquer** (save → publish → sync POS) + **Enregistrer sans activer**
- Panneau Simulation retiré du constructeur
- Badges Brouillon / v1 / Publié → Actif / À compléter / Synchronisé
- `FormulaVersion` reste technique (invisible)

### Classification options

- Script `npm run classify:option-chips` (lecture seule)
- Résultat local : **5 194** entrées · **98** articles · **0** orphelin
  - Matières/formats : 1 264
  - Finitions : 180
  - Dépendances : 1 512
  - Impact prix (formules) : 1 658
  - Affectation produit : 131
  - Historique : 449
- Livrables : `data/option-chips-classification.json` + `.md`
- Tests : `tests/option-chip-classification.test.ts`

### Encore ouvert

1. Migration réelle (rattachement canonique) selon le rapport — pas de fusion destructive tant que non validé
2. Remplacer Brouillon/Publié dans fiches produit hors constructeur
3. Suppression physique des panels UI morts après validation métier

### UI Produits (lot 3)

- Bandeau « Prochaines actions utiles » retiré du cockpit
- Barre recherche Produits : layout empilé, pills, overflow corrigé

## Tests

- `tests/pricing-studio-nav-suppression.test.ts` — nav sans Simulation/Versions + redirects
- `tests/option-chip-classification.test.ts` — classification buckets

## Rollback

Réintroduire les entrées dans `PRICING_STUDIO_SECTIONS` / `FINITIONS_SUBTABS` et rebrancher les panels — données intactes.
