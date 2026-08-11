# 04 — Frontend Components Audit

## Synthèse

Next.js App Router — `app/(app)/` pour écrans métier, `components/` par domaine. Backoffice v2 sous `components/backoffice-v2/`.

## Modules UI matures

| Module | Composants | État |
|---|---|---|
| Backoffice pricing | `pricing-custom/*`, `options/*` | ✅ Refonte récente |
| Matières & prix | `BaseMaterialPricesTable`, drawer, inline edit | ✅ Vague 3 |
| Stock | `StockItemCompleteModal`, workspace tabs | ✅ Refonte SKU |
| POS | `components/pos/*` | ⚠️ À harmoniser design |
| Commandes | `commande-360-view.tsx` | ✅ Hub central |
| Dashboard | `chart-widgets.tsx` | ⚠️ Lazy-load partiel |

## Problèmes

### P1 — Client/Server boundary

- **Symptôme :** Import services serveur dans client (ex. stockStatus corrigé)
- **Correction :** Utilitaires client dans `lib/utils/`, `lib/stock/`
- **Fichier corrigé :** `StockItemCompleteModal` → `stockStatusClient`

### P1 — Composants legacy backoffice

- **Fichiers :** `components/admin/*`, doublons avec `backoffice-v2`
- **Impact :** UX incohérente
- **Correction :** Redirections `administration/[section]` → shell v2
- **Priorité :** P2 (masquer, pas supprimer)

### P2 — Tables non virtualisées

- **Fichiers :** Options/chips global, matières 150+ lignes
- **Correction :** Virtualisation > 60 lignes (règle performance)
- **Réf :** `OrionColumnTable` déjà sur stock

### P2 — Card-in-card

- **Zones :** Anciens écrans administration legacy
- **Correction :** Design system `admin-backoffice.css`, blocs plats

## Design system

- Tokens : `--radius` 7px projet / 10px matières & stock modal
- CSS central : `components/backoffice-v2/admin-backoffice.css`
- Composants UI : `components/ui/` (shadcn/radix)

## Tests frontend

- Playwright 17 specs — smoke, commercial flow, backoffice
- Pas de tests composants React unitaires massifs (acceptable P2)
