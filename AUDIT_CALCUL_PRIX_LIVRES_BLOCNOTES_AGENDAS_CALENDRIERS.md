# AUDIT — Calcul prix Livres / Bloc-notes / Agendas / Calendriers

Date : 2026-07-12  
Périmètre : `bk-*`, `bn-*`, `cal-chevalet` / `cal-mural` + Administration

## Formule

```
prixUnitaire =
  ISF_par_page × nombre_pages   (intérieur)
  + couverture (ISF + finitions + supplément rigide Admin)
  + reliure (1× / exemplaire — Finitions & Reliures)
  + finitions exemplaire
  − remise palier Admin
```

### Pages vs feuilles

| Face | Feuilles physiques |
|------|-------------------|
| Recto | = pages |
| Recto-verso | = ceil(pages / 2) |

Piqûre à cheval : pages **multiples de 4** (`isSaddleStitchPagesCompatible`) — déjà filtré POS via `livres-binding-policy`.

## Sources (pas de duplication)

| Module | Rôle |
|--------|------|
| Impression sans finition | Prix / page intérieur & couverture imprimée |
| Finitions & Reliures | Spirale, piqûre, DCC, pelliculage, coins |
| Admin Publications | Fallbacks PU N&B/Quadri, couv. rigide, bloc collé, paliers |
| Stock & Matières | Via ISF / matière couverture |

## Fichiers

| Fichier | Rôle |
|---------|------|
| `lib/pricing/publication-core.ts` | Cœur ISF × pages + couverture + reliure |
| `lib/pricing/publication-pricing-rules.ts` | Params Admin + Excel |
| `lib/services/publication-pricing-sync.service.ts` | SystemConfig persist |
| `lib/pricing/livres-pricing.ts` | Rewrite → publication |
| `lib/pricing/bloc-note-pricing.ts` | Rewrite → publication (feuillets) |
| `lib/pricing/calendar-pricing.ts` | Chevalet/mural → publication |
| `calculate.ts` | Runtime ready + snapshot notes + remises |
| Admin | `/administration/publications-regles` + onglet **Publications** |
| POS | `publicationBreakdown` (intérieur / couverture / reliure) |
| `tests/publication-pricing.test.ts` | Tests pages/feuilles + 23 000 Ar |

## Exemple livre

200 × 50 + 8 000 couv. + 5 000 reliure = **23 000 Ar** (test overrides).

## Admin CRUD

Workspace Publications :
- modification inline des fallbacks ;
- **ajout / suppression** de paliers remise ;
- import / export Excel `01_PUBLICATIONS_REGLES` ;
- Sync POS.

Reliures / finitions / ISF restent éditables dans leurs modules dédiés (zéro doublon de grilles).

## Anomalies / POS

- Reliure incompatible → prix en attente  
- Pages / matière / format manquants → `missingField`  
- Snapshot panier : `livresNote` / `blocNoteNote` / `calendarNote` + `publication`

## Critères

| # | Critère | Statut |
|---|---------|--------|
| 1–5 | ISF + couv. + reliure + finitions + matières | OK |
| 6 | Reliure ×1 / exemplaire | OK |
| 7 | Feuilles selon face | OK (tests) |
| 8–9 | Compatibilité reliure / piqûre ×4 | OK (binding-rules + policy) |
| 10–11 | Admin + Excel | OK |
| 12–14 | POS détail + sync | OK |
| 15 | Build | Relancer après arrêt preview si EPERM |

## Suites

- Feuilles Excel 02–09 (intérieurs, couvertures, reliures compatibles…) = liens vers ISF / Finitions existants  
- `cal-plateau` reste sur chemin event ISF promo (prioritaire dans `calculate.ts`)  
- Remplacer progressivement les fallbacks Admin par grilles ISF complètes en production  
