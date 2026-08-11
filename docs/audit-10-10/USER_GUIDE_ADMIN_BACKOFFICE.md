# Guide — Administration & Backoffice

## Accès

**Menu :** Administration → Backoffice (`/administration/backoffice`)

## Organisation

| Zone | Usage |
|---|---|
| **Options / Chips** | Variables par article — impact prix, stock, POS |
| **Paliers** | Remises quantité par article |
| **Matières & prix de base** | Source matière + prix impression sans finition |
| **Prix & calculs** | Formules, simulateur |
| **Synchronisation** | Détection drift catalogue ↔ DB |

## Workflow publication

1. Modifier une valeur (table ou drawer)
2. La ligne passe en **Brouillon**
3. Vérifier **anomalies** (badge orange)
4. Cliquer **Publier** (ligne ou tout)
5. Le POS utilise uniquement les versions **Publiées**

## Règles importantes

- Ne jamais compter sur PRIX 2026 — archive uniquement
- Prix base sans finition = avant finitions, paliers, urgence
- Prix max = garde-fou sécurité
- Impact prix ON sans prix base → anomalie critique

## Anomalies courantes

| Anomalie | Action |
|---|---|
| Prix base manquant | Saisir prix base ou désactiver impact prix |
| Stock non lié | Depuis stock ou lien SKU |
| POS inactive + visible | Activer ou masquer POS |
| PRIX 2026 legacy | Migrer vers matières publiées |

## Raccourcis

- Recherche fuzzy : `chirable` trouve indéchirable
- Filtre « Prix manquant » pour compléter rapidement
- Menu « … » par ligne : dupliquer, archiver, usage POS
