# AUDIT — Nettoyage Catalogue POS

Date : 2026-07-11

## État avant

- Fusions déjà en place : personnalisés (`mergePersonalizedDuplicateArticles`), variantes finitions/GF/PVC (`merge-variant-pos-cards`), tirage photo, PLV.
- Boot `getPosCatalogue` applique masquages `POS_HIDDEN_ARTICLE_IDS`.
- Compteur cible ~95 articles visibles (pas 124).

## Problèmes trouvés

1. UI « Détecter doublons » absente (API `detect-duplicates` existait).
2. Menu Catalogue listait AVD (redondance hub prix).
3. Seed/fallback peuvent encore réintroduire des cartes si mal configurés (à surveiller en prod).

## Corrections faites

- Bouton **Détecter doublons catalogue** dans `CatalogueActionsMenu` → action `detect-duplicates`.
- Micro-item Catalogue **Anomalies & Doublons**.
- Sync Admin→POS remonte `catalogDuplicates.critical` dans le message audit.
- AVD retiré du micro-menu Catalogue (source prix = hub Base Prix).

## Règles conservées

- Un produit métier = un article ; variantes = chips.
- Bob / Casquette / Polo personnalisés → fusion vers canonique.
- Spirales / collage / plastification → une carte + options.
- Roll-up / X-Banner hors Grand Format (PLV).

## Tests

| Test | Résultat |
|------|----------|
| detect-duplicates | À valider UI |
| merge-personalized | Déjà OK (actions menu) |
| merge-variant-cards | Déjà OK |
| Redémarrage serveur sans réapparition | À valider (pas de seed prod) |

## Bugs restants

- Certains hits `format` / `recto_verso` restent en warn (fusion manuelle).
- Compteur exact dépend de la DB locale vs production.
