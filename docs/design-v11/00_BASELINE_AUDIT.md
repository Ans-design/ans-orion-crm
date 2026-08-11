# Design V11 — Baseline audit

**Date :** 2026-08-02  
**Métriques :** [`baseline-metrics.json`](./baseline-metrics.json) (script `scripts/design-v11-baseline-metrics.mjs`)

## Constats

- Cascade globals avec nombreux `@import` legacy.
- `!important` élevé (dette multi-sessions).
- Info sémantique était aliasé sur brand rouge → corrigé `#2563EB` (Lot 1).
- Rayons uniformes 7px → échelle V11 8 / 12 / 16 (control / card / overlay).

## Templates implicites (inventaire initial)

| Template | Pilote | Statut |
|----------|--------|--------|
| List | `/clients` | NOT_RUN migration |
| Dashboard | `/dashboard` | NOT_RUN |
| Detail | `/commandes/[id]` | NOT_RUN |
| Form | création client | NOT_RUN |
| MasterDetail | stock | NOT_RUN |
| Board | production | NOT_RUN |
| Configurator | POS | NOT_RUN |
| Messaging | `/messagerie` | NOT_RUN |

## Screenshots before

Dossier `docs/design-v11/screenshots/before/` — captures fixtures : **NOT_RUN** (dev local requis).

## Note

Pas de claim D001–D100 PASS. Socle tokens + galerie `/dev-preview/design-system` amorcé.
