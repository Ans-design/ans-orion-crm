# Audit UX/UI — ANS ORION (refonte ultraprompt)

Date : juin 2026  
Statut : **intégration complète** — voir `docs/UX_INTEGRATION_STATUS.md`

## Synthèse

Refonte UX/UI front exécutée selon l'ultraprompt : design system unifié, navigation simplifiée, backoffice premium, dark mode sans bleu dominant, ANS Talk pleine page.

## Corrections appliquées

### Dark mode — bleu dominant

- `lib/ui/status-styles.ts` : tons `STATUS_TONE` (info → slate, progress → cyan)
- Cockpit, KPI, alert ticker, kanban production : plus de `dark:bg-blue-950`
- Pages CRM : import `statusBadgeClass` / `ACTION_INFO_CLASS`

### Login

- Accordéon « Accès de démonstration » replié par défaut, sous le formulaire

### États loading / erreur / vide

- `LoadingState`, `RouteLoading`, `BackofficeLoading/Error/Empty`
- Suspense : messagerie, studio, dossiers GPAO

### Sidebar

- Favoris (étoile au survol) + modules récents
- Groupes repliés par défaut (sauf groupe actif)

### Backoffice

- Bandeau KPI `BackofficeKpiStrip`
- Header description + `pta-topnav` polish
- Chips catalogue 34px, liste dense 48px

### GPAO

- `GpaoDossierStepper` timeline + chips compactes
- Page dossiers avec `AppPageHeader`, badges centralisés

### ANS Talk

- Module `/messagerie` pleine page
- `FloatingMessengerBubble` désactivé (export `null`)

## Fichiers de référence

- `docs/DESIGN_SYSTEM_UX.md`
- `docs/UX_INTEGRATION_STATUS.md`
- `.cursor/rules/ui-ux.mdc`
