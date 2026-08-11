# Intégration ultraprompt UX/UI — statut

Référence : `ultraprompt_redesign_ux_ui_ans_orion_cursor.txt`  
Périmètre : front uniquement — backend / métier inchangés.

## Étapes 1–10 (ordre d'exécution ultraprompt)

| Étape | Contenu | Statut |
|-------|---------|--------|
| **1** | Audit UI (`docs/UI_AUDIT.md`) | ✅ |
| **2** | Design system (tokens, badges, Empty/Loading/Error, SectionHeader, RouteLoading) | ✅ |
| **3** | Layout global (sidebar regroupée, recherche, récents, favoris, groupes repliés) | ✅ |
| **4** | Backoffice (header, bandeau KPI, panels Loading/Error/Empty, catalogue 34px) | ✅ |
| **5** | Cockpit (KPI, alertes, AppLoadingState, actions sans bleu dark) | ✅ |
| **6** | POS (PageHeader, EmptyState, catalogue compact existant) | ✅ |
| **7** | Production / GPAO (timeline stepper, dossiers premium, kanban cyan) | ✅ |
| **8** | Modules secondaires (CRM statuts centralisés, studio/messagerie headers) | ✅ |
| **9** | Dark mode (suppression bleu dominant — `STATUS_TONE`, sweep composants) | ✅ |
| **10** | Polish (Suspense RouteLoading, règles Cursor, doc design system) | ✅ |

## Composants design system

| Composant | Chemin |
|-----------|--------|
| EmptyState | `components/ui/empty-state.tsx` |
| LoadingState | `components/ui/loading-state.tsx` |
| ErrorState | `components/ui/error-state.tsx` |
| RouteLoading | `components/ui/route-loading.tsx` |
| SectionHeader | `components/ui/section-header.tsx` |
| StatBadge | `components/ui/stat-badge.tsx` → `statusBadgeClass` |
| Exports unifiés | `components/ui/app-ui.ts` |
| Badges statut | `lib/ui/status-styles.ts` |
| Backoffice états | `components/admin/pricing-v4/backoffice-panel-state.tsx` |
| KPI bandeau BO | `components/admin/pricing-v4/backoffice-kpi-strip.tsx` |
| GPAO stepper | `components/production/gpao-dossier-stepper.tsx` |

## Navigation

- Sidebar : groupes collapsibles, recherche ⌘K, **Favoris** (`lib/nav/favorite-modules.ts`), **Récents** (`lib/nav/recent-modules.ts`)
- Backoffice : pleine page via `/administration/*` et `PricingAdminShell` — jamais popup
- ANS Talk : `/messagerie` pleine page — `FloatingMessengerBubble` retourne `null`

## Validation

```bash
npm run build
npm run test:e2e:prod   # inclut backoffice-messaging (0 bulle flottante)
```

## Critères ultraprompt (résumé)

- ✅ Design system cohérent
- ✅ Sidebar plus courte (groupes repliés + favoris/récents)
- ✅ Backoffice dense et premium
- ✅ Catalogue chips 34px + liste dense 48px
- ✅ États vides / loading / erreur professionnels
- ✅ Dark mode sans grand fond bleu
- ✅ ANS Talk intégré, non flottant
- ✅ Aucune fonctionnalité supprimée
