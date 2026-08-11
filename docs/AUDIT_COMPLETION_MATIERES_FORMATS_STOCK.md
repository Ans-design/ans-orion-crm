# Audit — Complétion Matières, formats & stock

Date : 2026-07-15  
Scope : cause de l’écran à zéro + correctifs immédiats (pas une refonte 22 phases).

## Diagnostic racine

| Élément | Constatt |
|--------|----------|
| Base locale | `file:./prisma/dev.db` |
| `BaseMaterial` | **185** lignes réelles (PCB, PCM, Plexi, etc.) |
| `BasePrintingPrice` | **433** |
| `StockItem` | **38** |
| `MaterialContextPrice` | **86** |
| Colonne `blankSellPrice` | **absente** dans SQLite avant correctif |

Le client Prisma exigeait `blankSellPrice` (ajouté au schema + migration `20260715100000_materials_unified_blank_sell`) alors que `prisma db push` n’avait jamais été rejoué en local.

Conséquence : `findMany` sur `BaseMaterial` échouait → API `/api/admin-backoffice/pricing/base-material-prices` en erreur → UI affichait **0 / 0 / 0** et « Aucune matière & prix de base ».

Ce n’était **pas** une absence de données métiers.

## Correctifs appliqués

1. `npx prisma db push` — colonne `blankSellPrice` (+ schéma aligné) créée en local.
2. API `base-material-prices` : try/catch + code `SCHEMA_DRIFT` avec message actionnable (`prisma db push`).
3. État vide UI reformulé (distinguer « vraiment vide » vs erreur charge).
4. Action admin **Compléter depuis le catalogue** (`GET base-materials?sync=1`) + bouton hub matières.
5. Backfill `blankSellPrice ← maxPrice` tenté : **0** lignes (maxPrice souvent null ; 31 matières avec `basePrintPrice`).

## Données retrouvées (échantillon)

PCB 130/170/300/600/700g, PCM 130/170/300g, Plexiglass 3/5mm — source `excel-import`, `publicationStatus: draft`, certaines avec prix base.

## Non livré (phases Ultra-Prompt restantes)

Refonte 6 onglets, Excel multi-feuilles, constructeur compatibilités, pagination serveur complète, permissions granulaires, Playwright Axe full — **hors correctif P0**.

Priorité suivante recommandée : grilles Déclinaisons / Formats / Prix contexte sur les 185 lignes déjà présentes, sans mocks.

## Validations

| Check | Résultat |
|-------|----------|
| Compte DB après push | 185 matières |
| Schéma SQLite | sync OK |
| Seed fictif | **non** utilisé |
| Lint / build full | non relancés dans ce lot (correctif schéma + API) |

## Commande de reprise locale

```bash
npx prisma db push
# puis recharger /administration/catalogue-prix-stock?studio=matieres
```
