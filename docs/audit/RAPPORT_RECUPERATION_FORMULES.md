# Rapport récupération formules — Vague 2

| Date | 2026-07-18 |
|------|------------|
| Statut | Classement — **aucune formule inventée** |

## Sources examinées

| Source | Contenu | Preuve |
|--------|---------|--------|
| Catalogue / seed restore | ~98 FormulaVersion, ~715 BusinessRule | Session V1 `restore:local-pricing` |
| Admin custom (hors catalogue) | **Absentes** si non seedées | Perte DATA-001 |
| Snapshots devis/commandes | configSnapshot historiques | Conservation historique OK |
| Excel / imports | drafts possibles | Pas source POS tant que non published |

## Classes

| Classe | Décision |
|--------|----------|
| Vérifiée et active (catalogue publié) | Conserver ; tests golden |
| Récupérable depuis catalogue code | `restore:local-pricing` seulement sur base jetable après backup |
| Absente (custom admin) | Fiche validation métier — **ne pas inventer** |
| Fictive / démo | Isoler DEMO_MODE |

## Fiches manquantes (template)

Pour chaque formule absente : articleId, famille, variables attendues, expression souhaitée, validateur métier, date.

Sans backup externe : **impossible** de restaurer les custom perdues automatiquement.
