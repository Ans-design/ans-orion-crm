# AUDIT CRM/ERP maître — ANS ORION

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-18 |
| Environnement | local Windows |
| Preuves | typecheck OK, prisma validate OK, inspection schéma/scripts |
| Limites | Pas de Git ; prod Neon non inspectée ; E2E non rejoués |

## Anomalies classées

### DB-001 — Dérive provider SQLite / PostgreSQL

| Champ | Contenu |
|-------|---------|
| Gravité | **Critique** |
| Priorité | P0 |
| Module | Infrastructure Prisma |
| Preuve | `schema.prisma` = sqlite ; `migration_lock.toml` = postgresql ; patch build Hostinger/Vercel |
| Attendu | Stratégie unique documentée + garde-fous anti mauvais `migrate`/`push` |
| Obtenu | Dual-mode volontaire mais risqué |
| Cause | Schéma local sqlite + migrations prod postgres + remplacement fichier au build |
| Correction | Documenter ; scripts garde `refuse-if-wrong-provider` ; ne jamais `migrate` sans check ; long terme : schema multi-fichier ou prisma config par env |
| Statut | Documenté — corrections code sûres partielles (URL sqlite absolue) |

### DB-002 — Pas de dépôt Git sur la copie de travail

| Champ | Contenu |
|-------|---------|
| Gravité | **Critique** |
| Priorité | P0 |
| Preuve | `git rev-parse` → fatal not a git repository |
| Impact | Pas de rollback commit, pas de revue, risque perte irréversible |
| Correction | Décision humaine : `git init` + remote, ou ouvrir le vrai clone Git |
| Statut | **Décision requise** → `DECISIONS_EN_ATTENTE.md` |

### DATA-001 — Perte / reconstruction données pricing locales

| Champ | Contenu |
|-------|---------|
| Gravité | Élevé |
| Priorité | P0/P1 |
| Preuve | Avant restore : 0 FormulaVersion, 0 BusinessRule ; après `restore:local-pricing` : 98 formules, 715 règles |
| Cause | DB vide + chemin sqlite double ; seed reconstruit depuis catalogue code |
| Impact | Formules **custom** admin non présentes dans le catalogue = perdues sans backup `.db` |
| Correction | Backup `prisma/dev.db.backup-*` ; script `npm run restore:local-pricing` ; ne plus seed sur DB réelle sans accord |
| Statut | Mitigé localement ; custom non récupérable |

### SYNC-001 — Source de vérité prix / dual shells admin

| Champ | Contenu |
|-------|---------|
| Gravité | Élevé |
| Priorité | P1 |
| Preuve | `/admin/pricing` vs `/administration/catalogue-prix-stock` ; onglet PRIX 2026 encore présent (relabelé archive) |
| Correction | Redirects + Studio Prix canonique ; archive PRIX 2026 lecture seule |
| Statut | Partiellement corrigé (session précédente) |

### SEC-001 — Fichiers `.env.backup-*` locaux

| Champ | Contenu |
|-------|---------|
| Gravité | Moyen (si secrets réels) |
| Priorité | P0 si exposés |
| Preuve | Présents à la racine ; gitignorés `.env.backup*` |
| Correction | Vérifier non commit ; rotation si jamais poussés ; ne pas afficher valeurs |
| Statut | Gitignore OK ; **pas de Git** donc risque copie ZIP |

### PERF-001 — Node 24 vs stack Next 14

| Champ | Contenu |
|-------|---------|
| Gravité | Moyen |
| Priorité | P2 |
| Preuve | Node v24.15.0 ; Next 14.2.28 ; `engines` absent |
| Correction | Ajouter `engines` Node 20 LTS recommandé ; documenter |
| Statut | À corriger Lot 1 (sûr) |

### UX-001 — Menus / libellés PRIX 2026 comme primaire

| Champ | Contenu |
|-------|---------|
| Gravité | Faible / Moyen |
| Priorité | P3 |
| Preuve | Corrigé partiellement (label archive, liens Studio Prix) |
| Statut | Amélioré |

## Sources de vérité (initial)

| Donnée | Source officielle (cible) | Consommateurs |
|--------|---------------------------|---------------|
| Articles / prix publiés | Backoffice + `ArticlePricingProfile` publié | POS, Devis |
| Stock | Mouvements / `StockItem` | POS, Production, Achats |
| Commande | Hub `/commandes/[id]` | GPAO, BAT, Livraison, Facture |
| Config admin | Tables Admin + publication | Modules ops |

Réf. existante : `docs/SYNC_MATRIX.md`.

## Corrections sûres immédiates (sans toucher données)

1. Documenter dérive Prisma (fait).
2. Ajouter `engines` Node dans package.json.
3. Garder URL SQLite absolue + `ensure-local-db` non destructif.
4. Interdire scripts seed/repair sans `APP_ENV=local` explicite (renforcer garde).

## Décisions humaines

Voir `DECISIONS_EN_ATTENTE.md`.
