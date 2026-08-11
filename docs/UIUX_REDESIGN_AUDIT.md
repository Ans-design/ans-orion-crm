# Audit UI/UX Redesign — ANS ORION

**Date :** 24 juin 2026  
**Objectif :** Passer d'une interface fonctionnelle à une expérience ERP/CRM premium, cohérente et orientée métier.

---

## 1. Références design étudiées

Inspiration (patterns, pas copie) : Linear, Notion, Airtable, HubSpot, Stripe Dashboard, Shopify Admin, Odoo, ERPNext, Material Design 3, Atlassian.

**Principes retenus :**
- Hiérarchie forte : titre → KPI → filtres → contenu → action
- Densité intelligente : listes compactes, cartes KPI plus basses
- Un pattern = un composant réutilisable
- Tokens couleur ANS (rouge/framboise/or) — fin du cyan `#00D9FF` et du rouge legacy `#cc0033`
- Actions tableau en icônes 16 px + tooltip
- Empty states avec action métier claire

---

## 2. Problèmes UI/UX détectés

| Problème | Impact | Modules touchés |
|----------|--------|-----------------|
| 3 systèmes de boutons (`AppButton`, `.ans-btn-primary`, `.pta-btn`) | Incohérence visuelle | POS, Backoffice, listes |
| Couleurs hex hardcodées (`#00D9FF`, `#cc0033`, `#FFD60A`) | Hors charte ANS 2026 | Devis, Clients, Commandes, POS |
| Chaque liste réinvente sa carte | Maintenance, UX hétérogène | Devis, Commandes, Livraisons |
| KPI trop hauts (120 px) | Scroll inutile | Dashboard, Devis |
| Filtres ad-hoc par page | Courbe d'apprentissage | Tous les modules liste |
| `rounded-xl` vs règle 7 px | Design non unifié | Global |
| Pages monolithiques (1000–5000 lignes) | Difficile à faire évoluer | Clients, POS conception, Planning |
| Emojis dans modales UI | Peu professionnel | Commandes edit, Backoffice |
| Pas de `ModuleShell` | Espacements irréguliers | Modules liste |

---

## 3. Composants design system — état

### Existants (renforcés phase 1)

| Composant | Fichier | Statut |
|-----------|---------|--------|
| `AppPageHeader` | `components/layouts/page-header.tsx` | + prop `compact` |
| `AppKpiCard` / `AppActivityTile` | `components/ui/kpi-card.tsx` | + `tone` sémantique |
| `AppEmptyState` | `components/ui/empty-state.tsx` | OK |
| `AppFilterBar` | `components/ui/app-filter-bar.tsx` | OK |
| `AppDataTable` | `components/ui/data-table.tsx` | Peu adopté |

### Créés phase 1

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `AppModuleShell` | `components/ui/module-shell.tsx` | Enveloppe page module |
| `AppModuleToolbar` | `components/ui/module-toolbar.tsx` | Recherche + filtres + chips |
| `AppKpiGrid` | `components/ui/kpi-grid.tsx` | Grille KPI cartes ou bandeau |
| `AppDataListRow` | `components/ui/data-list-row.tsx` | Ligne liste métier |
| `AppTableRowActions` | `components/ui/table-row-actions.tsx` | Actions icône alignées |
| `AppViewToggle` | `components/ui/view-toggle.tsx` | Liste / Kanban |
| `KPI_TONES` | `lib/design/kpi-tones.ts` | Couleurs sémantiques KPI |

**Export central :** `components/ui/app-ui.ts`

**CSS utilitaires :** `app/globals.css` — `.orion-module-*`, `.orion-data-row`, `.orion-kpi-strip`, `.orion-select-field`, `.orion-ref-muted`, `.orion-amount`

---

## 4. Modules — priorité et plan

| Priorité | Module | Fichiers clés | Phase |
|----------|--------|---------------|-------|
| P0 | Design system | `app-ui.ts`, `globals.css` | ✅ Phase 1 |
| P1 | Commandes liste | `app/(app)/commandes/page.tsx` | ✅ Phase 1 |
| P1 | Devis liste | `app/(app)/devis/page.tsx` | ✅ Phase 1 |
| P2 | Commande 360° | `components/commandes/order-*.tsx` | Phase 2 |
| P2 | CRM Clients | `app/(app)/clients/page.tsx` | Phase 2 — découpage |
| P2 | Panier | `app/(app)/panier/page.tsx` | Phase 2 |
| P3 | Catalogue POS | `app/(app)/pos/page.tsx` | Phase 3 |
| P3 | Production / GPAO | `app/(app)/production/` | Phase 3 |
| P3 | Studio & BAT | `app/(app)/studio/`, `bat/` | Phase 3 |
| P4 | Stock, Logistique, Finance | pages dédiées | Phase 4 |
| P4 | RH, ANS Talk | `messagerie/`, `rh/` | Phase 4 |
| P5 | Backoffice | `pricing-admin-shell.tsx` | Phase 5 |

---

## 5. Améliorations par module (cible)

### CRM Clients
- Découper `clients/page.tsx` en sous-composants
- `AppModuleToolbar` + `AppDataListRow` ou `AppDataTable`
- Formulaire en sections (Identité, Contact, Fiscalité…)
- Supprimer accents cyan

### Catalogue POS
- Grille articles premium, chips catégories unifiées
- Gate client visible, pas de mini-panier latéral
- Configurateur en étapes avec `AppSectionHeader`

### Panier / Devis
- Header client compact, totaux sticky
- Lignes via `AppDataListRow`
- Actions ligne : `AppTableRowActions`

### Commandes (360°)
- Header compact déjà amorcé
- Réduire blocs redondants synthèse
- Stepper production multi-lignes

### Production / GPAO
- Kanban cards compactes
- Statuts via `AppStatusBadge`

### ANS Talk
- Layout 3 colonnes type Slack
- Supprimer cadres imbriqués

### Backoffice
- Hub admin avec `ModuleHubCard`
- Tables éditables + `orion-select-field`

---

## 6. Structure standard page module

```
AppModuleShell
├── AppPageHeader (compact, icon, action principale)
├── AppKpiGrid (optionnel)
├── AppModuleToolbar (search, chips, filtres, view toggle)
├── loading → AppListSkeleton
├── empty → AppEmptyState + CTA métier
└── contenu (AppDataListRow[] | DataTable | Kanban)
```

---

## 7. Fichiers modifiés — phase 1

- `docs/UIUX_REDESIGN_AUDIT.md` (ce document)
- `lib/design/kpi-tones.ts`
- `components/ui/module-shell.tsx`
- `components/ui/module-toolbar.tsx`
- `components/ui/kpi-grid.tsx`
- `components/ui/data-list-row.tsx`
- `components/ui/table-row-actions.tsx`
- `components/ui/view-toggle.tsx`
- `components/ui/kpi-card.tsx`
- `components/ui/app-ui.ts`
- `components/layouts/page-header.tsx`
- `app/globals.css`
- `app/(app)/commandes/page.tsx`
- `app/(app)/devis/page.tsx`

---

## 8. Fichiers modifiés — phase 2 ✅

- `app/(app)/panier/page.tsx`
- `components/panier/cart-item-card.tsx`
- `components/panier/cart-summary.tsx`
- `components/panier/cart-actions.tsx`
- `components/panier/cart-empty-state.tsx`
- `components/commandes/order-header-compact.tsx`
- `components/commandes/commande-360-view.tsx`
- `components/commandes/order-next-action-card.tsx`
- `app/(app)/clients/page.tsx` (vue liste)

---

## 9. Ordre de travail recommandé (suite)

1. **Phase 3** — POS catalogue + fiche client (découpage profil)
3. **Phase 4** — Production, Stock, Logistique, Finance (même pattern liste)
4. **Phase 5** — ANS Talk layout + Backoffice hub
5. **Nettoyage** — Remplacer `#00D9FF` / `#cc0033` restants via grep global

---

## 10. Critères de validation

- [x] Document audit `docs/UIUX_REDESIGN_AUDIT.md`
- [x] Composants shell / toolbar / list row / KPI tones
- [x] Commandes + Devis listes refactorisées
- [x] Panier refactorisé (lignes compactes, sticky summary)
- [x] Commande 360° shell + header tokens
- [x] CRM Clients liste harmonisée
- [ ] 80 % des modules liste sur le même pattern
- [ ] Zéro cyan `#00D9FF` dans UI chrome
- [ ] Formulaires en sections logiques
- [ ] Build `npm run build` OK
- [ ] Flow CRM → POS → Panier → Devis → Commandes intact

---

## 11. Tests manuels minimum

1. `/commandes` — KPI, filtres chips, liste, kanban, edit modal
2. `/devis` — KPI, tri, liste, détail, suppression
3. Dark mode — lisibilité KPI strip et data rows
4. Responsive — toolbar empilée sur mobile
