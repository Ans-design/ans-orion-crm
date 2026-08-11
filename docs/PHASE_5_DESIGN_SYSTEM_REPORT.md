# Phase 5 — Design system Orion

**Date :** 2026-06-24  
**Statut :** Intégré  
**Périmètre :** Création du namespace `components/orion/` et adoption progressive sur les modules commerciaux.

---

## Objectif

Centraliser l’UI ANS ORION dans un design system nommé **Orion**, sans migration de stack ni suppression des alias `App*` existants (`components/ui/app-ui.ts`).

Les composants s’appuient sur :

- classes `orion-ds-*` (`styles/design-system.css`)
- tokens (`lib/design/tokens.ts`, `lib/design/spacing-system.ts`)
- primitives existantes (PageHeader, EmptyState, Table, Tabs, etc.)

---

## Composants créés

| Composant | Fichier | Rôle |
|-----------|---------|------|
| `OrionPageHeader` | `orion-page-header.tsx` | En-tête module |
| `OrionActionBar` | `orion-action-bar.tsx` | Barre d’actions / toolbar |
| `OrionCard` | `orion-card.tsx` | Surface carte (interactive / elevated) |
| `OrionDataTable` | `orion-data-table.tsx` | Table stylée + sous-composants (pré-TanStack) |
| `OrionEmptyState` | `orion-empty-state.tsx` | État vide |
| `OrionSkeleton` | `orion-skeleton.tsx` | Chargement shimmer |
| `OrionStatusBadge` | `orion-status-badge.tsx` | Statut métier (devis, commande…) |
| `OrionPriorityBadge` | `orion-priority-badge.tsx` | Priorité Basse / Normale / Haute / Urgente |
| `OrionPriceDisplay` | `orion-price-display.tsx` | Montants tabulaires (`formatPriceAr`) |
| `OrionFormField` | `orion-form-field.tsx` | Label + champ + hint / erreur |
| `OrionTabs` | `orion-tabs.tsx` | Onglets Radix stylés ORION |
| `OrionSection` | `orion-section.tsx` | Section bloc ou carte |
| `OrionConfirmDialog` | `orion-confirm-dialog.tsx` | Confirmation destructive / standard |

**Barrel :** `components/orion/index.ts`

---

## Pages intégrées

| Module | Composants Orion |
|--------|------------------|
| Panier | `OrionPageHeader`, `OrionConfirmDialog` |
| Clients | `OrionPageHeader`, `OrionEmptyState`, `OrionConfirmDialog` |
| POS | `OrionPageHeader`, `OrionEmptyState` |
| Devis | `OrionPageHeader`, `OrionEmptyState`, `OrionConfirmDialog` |
| Commandes | `OrionPageHeader`, `OrionEmptyState`, `OrionStatusBadge`, `OrionPriorityBadge` |
| Dashboard | `OrionEmptyState` |
| Admin | `OrionPageHeader` |
| POS configurateur | `OrionCard`, `OrionPriceDisplay` (`product-pricing-panel.tsx`) |

**Messagerie / backoffice :** conservent leurs en-têtes spécialisés (ANS Talk, administration) — migration prévue en phase ultérieure.

---

## Convention d’usage

```tsx
import {
  OrionPageHeader,
  OrionEmptyState,
  OrionCard,
} from '@/components/orion';
```

- **Nouveaux écrans :** préférer `@/components/orion`.
- **Code legacy :** les alias `AppPageHeader`, `AppEmptyState`, etc. restent valides (même implémentation sous-jacente).
- **Phase 6 :** `OrionDataTable` sera branché sur TanStack Table.

---

## Tests

- `tests/orion-components.test.ts` — smoke des exports
- `tests/design-tokens.test.ts` — tokens inchangés

---

## Vérifications

```bash
npm run typecheck
npm run test
```

(Build : arrêter le serveur dev si `prisma generate` verrouille le moteur.)

---

## Prochaine étape — Phase 6

Standardiser les listes denses avec **TanStack Table** via `OrionDataTable` (clients, devis, commandes, stock).
