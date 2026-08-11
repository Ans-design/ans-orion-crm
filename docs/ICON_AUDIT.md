# Audit iconographie ANS ORION

**Date :** 24 juin 2026  
**Bibliothèque :** Lucide React (outline uniquement)  
**Source centralisée :** `lib/icons/app-icons.ts`, `lib/icons/icon-sizes.ts`, `components/ui/app-icon.tsx`

---

## Résumé exécutif

| Catégorie | Nombre | Détail |
|-----------|--------|--------|
| Garder | ~55 modules | Déjà Lucide, sémantique correcte |
| Remplacer | 28 modules | Ambiguïté, doublon ou hors mapping |
| Supprimer | 12 zones | Emojis décoratifs UI (backoffice, profils) |
| Ajouter | 6 zones | Onglets commande, actions backoffice |
| Tailles harmonisées | Sidebar | Univers 18 px, sous-modules 16 px |

**Style retenu :** contour Lucide, `strokeWidth={1.75}`, couleurs via tokens (`text-muted-foreground`, `text-primary`, etc.).

---

## Tailles standard (implémentées)

| Niveau | Token | px |
|--------|-------|-----|
| Sidebar univers | `sidebar-main` / `lg` | 18 |
| Sidebar sous-module | `sidebar-sub` / `md` | 16 |
| Topbar / recherche mini | `topbar` / `lg` | 18 |
| Recherche sidebar | `md` | 16 |
| Actions tableau | `table-action` / `md` | 16 |
| KPI | `kpi` | 20 |
| Empty state | `empty` | 48 |
| Badges | `sm` | 14 |

---

## Modules — décisions principales

| Module | Zone | Icône avant | Problème | Décision | Icône recommandée | Justification |
|--------|------|-------------|----------|----------|-------------------|---------------|
| pos | Sidebar | Printer | Confondu avec impression | Remplacer | Store | Catalogue point de vente |
| reclamations | Sidebar | AlertOctagon | Trop agressif, SAV | Remplacer | MessageCircleWarning | Litige / réclamation client |
| production | Sidebar | Factory | Doublon poste prod | Remplacer | Kanban | Module = tableau Kanban |
| gpao_dossiers | Sidebar | FolderKanban | Hors mapping GPAO | Remplacer | FolderCog | Dossier production 16 étapes |
| planning | Sidebar | Calendar | Générique | Remplacer | CalendarDays | Planning Gantt journalier |
| equipe_taches | Sidebar | ListTodo | Incohérent | Remplacer | ListChecks | Tâches métier cochables |
| qualite | Sidebar | ClipboardCheck | Proche BAT | Remplacer | BadgeCheck | Contrôle qualité validé |
| plan_matiere | Sidebar | Trash2 | = supprimer | Remplacer | Recycle | Déchets & pertes matière |
| studio_briefs | Sidebar | FolderKanban | Ambigu | Remplacer | ClipboardPen | Brief créatif |
| studio_fichiers | Sidebar | FileImage | Trop spécifique | Remplacer | Files | GED sources |
| prepresse | Sidebar | ScanEye | Peu lisible | Remplacer | PrinterCheck | Vérification avant tirage |
| conception | Sidebar | Palette | Doublon studio | Remplacer | PenTool | Conception graphique |
| stock | Sidebar | Package | Doublon | Remplacer | Boxes | Gestion multi-références |
| ws_magasin | Sidebar | Package | Doublon stock | Remplacer | Warehouse | Magasin physique |
| ws_logistique | Sidebar | Truck | Doublon livraisons | Remplacer | Route | Tournées conducteur |
| factures | Sidebar | Receipt | Style mixte | Remplacer | ReceiptText | Facture document |
| paiements | Sidebar | Banknote | Confondu charges | Remplacer | CreditCard | Encaissement |
| finance_charges | Sidebar | CircleDollarSign | Peu distinct | Remplacer | Banknote | Sorties / charges |
| finance_couts | Sidebar | PieChart | Analytique | Remplacer | Calculator | Coût de revient |
| finance_fiscalite | Sidebar | FileText | Générique | Remplacer | Landmark | Fiscalité institutionnelle |
| rapports_performance | Sidebar | BarChart3 | Doublon rapports | Remplacer | TrendingUp | Performance |
| rh_recruitment | Sidebar | UserSearch | Peu standard | Remplacer | UserPlus | Recrutement |
| rh_absences | Sidebar | CalendarClock | Dense | Remplacer | CalendarOff | Congés |
| machines | Sidebar | Cpu | Abstrait | Remplacer | Wrench | Maintenance machines |
| materiels | Sidebar | Laptop | Trop étroit | Remplacer | MonitorCog | Équipements |
| ws_conducteur | Sidebar | Cpu | Incohérent | Remplacer | Printer | Conducteur presse |
| admin_backoffice | Sidebar | Settings2 | Variante | Remplacer | Settings | Backoffice standard |
| admin_catalogue | Sidebar | Sliders | Ambigu | Remplacer | Boxes | Catalogue articles |
| admin_prix_nav | Sidebar | Tag | Étiquette | Remplacer | Calculator | Prix & formules |
| admin_variables_nav | Sidebar | Layers | Confondu modèles | Remplacer | SlidersHorizontal | Variables |
| admin_flux_statuts | Sidebar | Activity | Doublon santé | Remplacer | GitBranch | Flux métier |
| admin_synchronisation | Sidebar | Radio | Bandeau alertes | Remplacer | RefreshCw | Sync données |
| admin_import_export | Sidebar | Download | Partiel | Remplacer | DownloadCloud | Import / export |
| admin_overview | Sidebar | LayoutGrid | Cockpit bis | Remplacer | LayoutDashboard | Vue d'ensemble |
| aide | Sidebar | HelpCircle | Variante | Remplacer | CircleHelp | Centre d'aide |
| cockpit | Sidebar | LayoutDashboard | OK | Garder | LayoutDashboard | Cockpit |
| commandes | Sidebar | ClipboardList | OK | Garder | ClipboardList | Commandes |
| clients | Sidebar | Users | OK | Garder | Users | CRM |
| equipe_messages | Sidebar | MessageSquare | OK | Garder | MessageSquare | ANS Talk |

---

## Univers sidebar

| Univers | Avant | Décision | Après | Justification |
|---------|-------|----------|-------|---------------|
| Stock & Achats | Package | Remplacer | Boxes | Cohérent module stock |
| RH | Users | Remplacer | UsersRound | Distinct CRM clients |
| Autres | — | Garder | Inchangé | Sémantique claire |

---

## Commandes (fiche 360°)

| Zone | Composant | Avant | Décision | Après | Justification |
|------|-----------|-------|----------|-------|---------------|
| Onglets | order-tabs | Texte seul | Ajouter | ClipboardList, Factory, FileCheck, Truck, ReceiptText, History | Navigation rapide métier |
| KPI reste | order-kpi-grid | Banknote | Remplacer | CircleDollarSign | Reste à payer |
| KPI tâches | order-kpi-grid | ListTodo | Remplacer | ListChecks | Aligné module tâches |
| KPI facture | order-kpi-grid | Receipt | Remplacer | ReceiptText | Finance document |
| Timeline | order-timeline-tab | AlertCircle audit | Remplacer | History | Événements passés |
| Empty timeline | order-timeline-tab | Clock 24px | Remplacer | History 48px | Empty state standard |

---

## Backoffice pricing

| Onglet | Avant | Décision | Après |
|--------|-------|----------|-------|
| Santé | Shield + emoji | Remplacer | Activity (santé système) |
| Articles | Package + emoji | Remplacer | Boxes |
| PRIX 2026 | DollarSign + emoji | Remplacer | Calculator |
| Variables | Tag + emoji | Remplacer | SlidersHorizontal |
| Tous onglets | emoji affiché | Supprimer | Lucide seul |
| Actions shell | 💾 🚀 ⬇ | Remplacer | Save, Rocket, Download |

---

## Actions globales (mapping cible)

| Action | Icône | Statut |
|--------|-------|--------|
| Voir | Eye | Centralisé `ACTION_ICONS` |
| Modifier | Pencil | Centralisé |
| Supprimer | Trash2 | Centralisé |
| Dupliquer | Copy | Centralisé |
| Rechercher | Search | Centralisé |
| Filtrer | Filter | Centralisé |
| Historique | History | Centralisé |

**Phase 2 :** migrer les pages métier vers `AppIcon action="edit"` au lieu d'imports Lucide directs.

---

## À supprimer / ne pas étendre

| Zone | Problème | Décision |
|------|----------|----------|
| `role-registry.ts` emoji profils | Emoji décoratif | Garder phase 1 (hors navigation) — phase 2 remplacer par Lucide |
| `config-types.ts` emoji sections POS | Labels formulaire | Garder (données config, pas UI chrome) |
| Réactions ANS Talk emoji | Métier conversation | Garder (réactions utilisateur) |
| Toast `icon: '✓'` | Succès toast | Acceptable (micro-feedback) |

---

## Fichiers modifiés (phase 1)

- `lib/icons/app-icons.ts` — mapping modules, actions, univers
- `lib/icons/icon-sizes.ts` — tailles sémantiques
- `components/ui/app-icon.tsx` — wrapper `<AppIcon />`
- `lib/modules/module-registry.ts` — injection `getModuleIcon()`
- `lib/navigation/sidebar-universes.ts` — `UNIVERSE_ICONS`
- `components/layout/sidebar/sidebar-universe-nav.tsx` — tailles 18/16
- `components/layout/orion-sidebar.tsx` — recherche 16/18
- `components/commandes/order-tabs.tsx` — icônes onglets
- `components/commandes/order-kpi-grid.tsx` — harmonisation KPI
- `components/commandes/order-timeline-tab.tsx` — timeline
- `lib/pricing/pricing-admin-ui.ts` — onglets backoffice
- `components/admin/pricing-v4/pricing-admin-shell.tsx` — actions sans emoji

---

## Phase 2 recommandée

1. Migrer `board-synthesis.tsx` (cockpit) vers `MODULE_ICONS`
2. Harmoniser actions tableaux (`Eye`, `Pencil`, `Trash2`) via `ACTION_ICONS`
3. POS / panier : boutons ligne panier
4. ANS Talk : composer (Send, Paperclip déjà Lucide)
5. Topbar globale (notifications, profil, thème) → 18 px
6. Empty states ANS Talk, listes vides → `getIconSize('empty')`
7. Retirer emojis `role-registry` au profit d'icônes Lucide profil

---

## Critères de validation

- [x] Inventaire `docs/ICON_AUDIT.md`
- [x] Mapping centralisé `lib/icons/app-icons.ts`
- [x] Tailles sidebar uniformisées (18 / 16)
- [x] Modules ambigus remplacés via registry
- [x] Onglets commande avec pictos métier
- [x] Backoffice sans emoji dans tabs/actions
- [ ] Actions tableaux 100 % harmonisées (phase 2)
- [ ] Topbar complète (phase 2)
- [ ] Zéro emoji UI hors réactions / config données (phase 2)
