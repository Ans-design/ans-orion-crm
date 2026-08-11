# Règles de normalisation matières

## Objectif

Éviter les doublons entre libellés POS (Glossy, Couché brillant, C. brillant) tout en conservant l'historique.

## Champs

| Champ | Rôle |
|---|---|
| `materialKey` | Clé stable `{base}:{grammage}` ex. `offset:80g` |
| `normalizedName` | Nom normalisé sans accents, minuscules |
| `displayName` | Libellé affiché Backoffice |
| `aliases` | JSON — variantes connues |
| `family` | Petit format / Grand format / Carte / Autre |

## Règles

1. Ne pas fusionner automatiquement — marquer « doublon probable » dans l'audit.
2. Glossy = alias de Couché brillant pour la même famille.
3. Grammages normalisés : `80g`, `300g`, `3mm` (sans espace).
4. PRIX 2026 n'est jamais source de prix — inventaire uniquement si référencé.

## Service

`lib/server/modules/materials/material-key.ts` — `buildMaterialKey`, `normalizeMaterialName`
