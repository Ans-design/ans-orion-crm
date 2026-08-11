# Audit — Refonte Catalogue POS (Sprint 1)

Date : 2026-07-15  
Règle : zéro suppression de données / API / moteurs ; retirer uniquement les doublons d’interface.

## Matrice Fonction / Source / Doublon / Décision / Nouvel emplacement

| Fonction | Source réelle | Doublon | Décision | Nouvel emplacement |
|----------|---------------|---------|----------|--------------------|
| Liste articles Catalogue | `CataloguePosUnifiedWorkspace` + `GET …/options/articles` | Liste pricing `ArticleCatalogPage` | **Sprint 2** : Catalogue studio = `PricingArticlesWorkspace` ; ancienne vue `?legacyConfig=1` | Studio **Catalogue** (`articles`) |
| Catalogue POS autonome | `/administration/catalogue-pos` | Menu `admin_catalogue` (hidden), `config_hub` (hidden) | Redirection vers CPS ; menu Admin POS commercial (`/pos`) conservé | Redirect → `catalogue-prix-stock?studio=articles` |
| Options / Chips globales | `OptionsChipsWorkspace` via onglet Catalogue « Options / Chips » | Même workspace sous article + legacy backoffice chips | Retirer onglet global Catalogue ; une bibliothèque | Studio **Options & finitions** → sous-onglet Bibliothèque options (`tab=chips`) |
| Chips par article | `CatalogueStudioPanel` → `OptionsChipsWorkspace` embedded | — | Conserver (affectation fiche) Sprint 1 | Fiche article (panel droit) |
| Vue essentielle / avancée | `OptionsChipsWorkspace` `chipsColumnView` | Intitulés UX | Renommer Mode standard / avancé + localStorage | Même composant |
| Variables (studio article) | Agrégat chips dans `CatalogueStudioPanel` | `PricingVariable` + Prix & règles | Affichage local OK Sprint 1 ; centralisation Sprint 3 | Prix & règles (cible) |
| Dépendances | `OptionDependenciesPanel` + `OptionDependency` | GoodiesOptionDependency | Conserver panneau article Sprint 1 | Options & finitions → Dépendances (Sprint 3) |
| Historique local fiche | `BackofficeAuditLogPanel` / onglet studio | Historique studio CPS | Ne pas supprimer ; centralisation Sprint 3 | Historique & corbeille |
| Corbeille articles | `CatalogueArticlesCorbeilleTable` (`view=corbeille`) | Corbeille matières CPS | Conserver | Historique → Corbeille |
| Import / Export chips Excel | `ExcelTableActions` dans chips workspace | Module Import/Export CPS | Garder bouton Sprint 1 ; dés-duplicate Sprint 3 | Import / Export (cible) |
| Ordre POS | `ProductOptionGroup.sortOrder` + tri `pos-order` | Valeurs anormales (ex. 3000000) | Affichage inchangé Sprint 1 ; normalisation Sprint 4 | Apparence POS / bibliothèque |
| Visibilité POS (chip) | `ProductOptionGroup.visiblePos` | Toggle POS article | Conserver dualité groupe vs article | Bibliothèque + fiche |
| Visibilité POS (article) | profil / `visiblePos` article | Badge « Masqué » + Brouillon | Simplifier badges liste | Liste Catalogue |
| Catégorie POS | family / category sur profil | Catégories pricing | Héritage catalogue (Sprint 2 Apparence POS) | Apparence POS |
| Statuts | `draft` / `published` / active | Badges multiples | Vocab `ADMIN_UI` ; archives séparées | Liste + fiche |
| Archives / fusion `[archivé→…]` | Labels merge services | Affichés par défaut (`includeInactive=1`) | Masquer par défaut + filtre + strip display | Liste Catalogue |
| Finitions prix | `PriceTableWorkspace` / forcedTab finitions | Nav « Chips · reliures » trompeur | Sous-onglet Finitions & façonnage | Options & finitions |
| Prix / formules | `ArticlePricingCard` / `product-sheet` | Catalogue chips | Ne pas toucher moteurs | Prix & règles |
| Models Prisma chips | `ProductOptionGroup` + `ProductOptionValue` | Pas de modèle OptionChip | Source de vérité | Inchangé |

## Routes

| Route | Rôle |
|-------|------|
| `/administration/catalogue-prix-stock` | Hub canonique (8 studios) |
| `/administration/catalogue-pos` | Redirect legacy → CPS |

## Critères Sprint 1 (suivi)

- [x] Matrice publiée
- [x] Onglet global Options/Chips retiré du Catalogue
- [x] Bibliothèque options sous Options & finitions
- [x] Archives masquées + strip `[archivé→]`
- [x] Mode standard / avancé
- [x] Tests contrats
