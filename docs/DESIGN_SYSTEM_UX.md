# Design system UX — ANS ORION

Guide de consolidation front (refonte ultraprompt). Backend et règles métier inchangés.

## Principes

- Premium SaaS print studio : dense, lisible, sobre
- Un seul langage visuel pour tous les modules
- Tokens et composants partagés — pas de couleurs hardcodées par écran
- Dark mode : fonds sombres neutres ; **pas de grand fond bleu**

## Imports recommandés

```ts
import {
  AppEmptyState,
  AppErrorState,
  AppKpiCard,
  AppPageHeader,
  AppStatusBadge,
} from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { statusBadgeClass, STATUS_TONE, ACTION_INFO_CLASS } from '@/lib/ui/status-styles';
```

## Tons sémantiques (`STATUS_TONE`)

| Ton | Usage | Classes |
|-----|--------|---------|
| `neutral` | Brouillon, archivé | `bg-muted text-muted-foreground` |
| `info` | Envoyé, émis, en livraison | slate discret |
| `progress` | En production, en cours | cyan discret |
| `success` | Payé, livré, conforme | vert |
| `warning` | En attente, stock | jaune |
| `danger` | Annulé, bloqué, NC | rouge |

## Composants d’état

| Composant | Quand l’utiliser |
|-----------|------------------|
| `EmptyState` | Liste/table sans données |
| `LoadingState` | Chargement initial ou refetch |
| `ErrorState` | Échec avec retry |
| `Skeleton` / `ListSkeleton` | Placeholder structurel |

## Rayons et espacements

- Radius cartes/boutons : **7px** (`rounded-[7px]` / `--orion-radius`)
- Hauteur ligne dense catalogue : **48px**
- Chips catalogue : **34px**
- Touch target minimum : **44px** (mobile)

## Navigation

- Sidebar : 12 domaines max, groupes collapsibles
- Recherche module (⌘K + champ sidebar)
- Modules récents : `lib/nav/recent-modules.ts`

## Backoffice

- Pleine page via `PricingAdminShell` — pas de popup principale
- Bandeau `pta-topnav` + contenu `pta-content`
- Classes CSS : `pricing-admin.css` (`pta-*`, `acat-*`)

## Interdictions

- Widget flottant permanent (ANS Talk → `/messagerie`)
- Gradients décoratifs excessifs
- Badges multicolores sans logique métier
- Dupliquer une map de statuts — utiliser `statusBadgeClass`
