# Carte Admin — 3 piles UI (Lot 7, sans suppression)

Date : 2026-07-30  
Règle : **zéro suppression** — fusionner / rediriger / masquer, pas retirer.

## Source de vérité navigation

- Menus : `lib/administration/admin-macro-modules.ts` + `role-registry` / `module-registry`
- **7 macros plates** : Vue d’ensemble, Matières, Articles finis, Formules & moteurs, Production & Flux, Temps & capacités, Organisation
- Gate sidebar : `canAccessAdministration` (`lib/navigation/can-access-administration.ts`) — admin | manager uniquement
- Routes canoniques : **`/administration/:section`** (pas de popups métier)
- Alias legacy conservés : `/admin-control`, `/admin/*`, `/admin/pricing`, etc.

## Les 3 piles (coexistence volontaire)

| Pile | Dossier | Rôle actuel | Entrée typique |
|------|---------|-------------|----------------|
| **A — Hub Administration** | `components/administration/**` | Shell macro + workspaces métier unifiés | `/administration/*` via `AdministrationHubLayout`, `AdministrationMacroNav` |
| **B — Admin legacy / studios** | `components/admin/**` | Pricing v4, catalogue-prix-stock, formula-workspace, contrôles santé | Panels embarqués dans hub ou alias `/admin/*` |
| **C — Backoffice v2** | `components/backoffice-v2/**` (+ `components/backoffice/**`) | Tables matières/prix/chips/tiers, shell AB2 | Sous-sections pricing / options / sync |

## Règle d’usage (ne pas dupliquer écrans)

1. **Nouvelle feature admin** → workspace sous `components/administration/` + entrée macro.
2. **Tables densés matières / chips / tiers** → réutiliser `backoffice-v2` (déjà branché).
3. **Pricing v4 / CPS / formules** → rester dans `components/admin/...` tant que le hub les compose ; ne pas créer une 4ᵉ pile.
4. **Alias** → redirection ou même composant ; pas de copie de logique métier.

## Mapping rapide hub → composants

| Section macro (ex.) | Workspace principal |
|---------------------|---------------------|
| Vue ensemble | `administration/overview/OverviewUnifiedWorkspace` |
| Catalogue / POS studio | `administration/catalogue/*` + panneaux `admin/catalogue-prix-stock` |
| Prix articles | `administration/prix-articles/PrixArticlesWorkspace` |
| Matières | `administration/materials/*` + tables `backoffice-v2/pricing-custom` |
| Vente directe | `administration/direct-sale/*` |
| Sync | `administration/sync/SyncUnifiedWorkspace` |
| Estimation temps | `administration/estimation-temps/*` |
| Production flux | `administration/production-flux/*` |

## Prochaines étapes (fusion progressive)

- [ ] Inventaire des routes `/admin/*` encore hors macro → alias vers `/administration/...`
- [ ] Documenter chaque panel `fusion-admin-panels.tsx` / pricing-v4 comme « embarqué » ou « legacy redirect »
- [ ] Unifier CSS radius 7px déjà partiellement fait (`docs/audit/HARMONISATION_UI_UX_GLOBALE.md`)

Aucune pile n’est à supprimer dans ce lot.
