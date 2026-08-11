# Audit & analyse — Sidebar Univers Administration & Commercial

**Date :** 2026-07-30  
**Cible DOM :** boutons `SidebarUniverseNav` — « Administration » (groupe ~9) et « Commercial 6 » (groupe ~1)  
**Composant React :** `SidebarUniverseNav`  
**Méthode :** lecture code + registries + CSS (aucune modification runtime)  
**Workspace :** `c:\Users\ans\Desktop\2em-export-complet-UNIQUE`

---

## 1. Synthèse exécutive

| Élément | Verdict |
|---------|---------|
| **Commercial** | Univers index 1 ; flow métier **6 étapes** numérotées 1→6. Le « **6** » à côté de Commercial / Réclamations est surtout le **numéro d’étape** (structure), pas forcément un compteur live. |
| **Administration** | Univers index 9 ; **7 macros plates** (pas de sous-menus dans la sidebar). Micros (Sync, Variables, etc.) via dropdown page. |
| **Risque P0** | L’univers Administration est **toujours injecté** pour tous les rôles, sans filtre. Routes protégées → `/non-autorise`, mais le menu reste visible. |
| **Cohérence docs** | `MODULES_MAP` parle encore de 6 macros ; le code expose **7** (+ Temps & capacités). |

---

## 2. Architecture

```text
OrionSidebar (orion-sidebar.tsx)
  │  role + moduleAccess API → buildSidebarUniverses()
  │  openUniverseId (localStorage: orion-sidebar-universe)
  │  badges = useNavBadges() → /api/nav/badges
  ▼
SidebarUniverseNav (sidebar-universe-nav.tsx)
  ├─ Univers standard → UniverseSubList → SubModuleRow
  │     Commercial : flow steps 1→N + MODULE_BADGE_KEYS
  └─ Univers administration (adminNav: true)
        → AdministrationMacroNav (7 macros plates)
        → badges = useAdminMacroBadgeCounts → /api/admin-backoffice/overview
```

### Pipeline de données

| Couche | Fichier | Rôle |
|--------|---------|------|
| Profils / menus bruts | `lib/modules/role-registry.ts` | Liste `moduleId` par rôle |
| Métadonnées modules | `lib/modules/module-registry.ts` | label, href, group, status |
| Filtrage | `lib/modules/index.ts` → `buildNavForRole` | `status≠hidden` + permissions + `canAccessPage` |
| Univers sidebar | `lib/navigation/sidebar-universes.ts` | 11 univers, mapping group→universe, ordre |
| Assemblage | `lib/navigation/build-sidebar-universes.ts` | Buckets + **cas spécial Admin** |
| Admin macros | `lib/administration/admin-macro-modules.ts` + `data/admin-nav-config.json` | UI Admin réelle |
| Actif / ARIA | `lib/navigation/sidebar-active.ts` | `isGroupActive` / `isItemActive` |

### Index des univers (`SIDEBAR_UNIVERSES`)

| Index (0-based) | order | id | Label UI |
|-----------------|-------|-----|----------|
| 0 | 1 | `pilotage` | Pilotage |
| **1** | **2** | **`commercial`** | **Commercial** ← cible DOM |
| 2–8 | 3–9 | production…communication | … |
| **9** | **10** | **`administration`** | **Administration** ← cible DOM |
| 10 | 11 | `mon_espace` | Mon espace |

### Cas spécial Administration (code)

Dans `buildSidebarUniverses` :

```ts
if (def.id === 'administration') {
  result.push({ … items: [], adminNav: true });
  continue; // ignore les items registry du bucket
}
```

→ L’univers Admin est **toujours** poussé, items vides, `adminNav: true`. Les modules `administration_parametres` issus de `buildNavForRole` sont **ignorés** pour la sidebar.

---

## 3. Composant `SidebarUniverseNav`

**Fichier :** `components/layout/sidebar/sidebar-universe-nav.tsx`

### Props principales

| Prop | Rôle |
|------|------|
| `universes` | Liste assemblée |
| `openUniverseId` | Accordéon (un seul ouvert) |
| `pathname` / `locationSearch` | Actif + deep-links QS |
| `badges` | Compteurs modules / univers |
| `mini` / `flyoutUniverseId` | Mode icônes + flyout |
| `onToggleUniverse` / `onNavigate` | Open/close + `router.push` |

### États CSS / ARIA (boutons observés)

| État DOM | Classes / ARIA | Condition |
|----------|----------------|-----------|
| Ouvert | `orion-sb-universe-btn-open`, `aria-expanded="true"` | `openUniverseId === universe.id` |
| Parent actif | `orion-sb-universe-btn-active`, `aria-current="true"` | Enfant actif **et** ouvert |
| Enfant actif fermé | `orion-sb-universe-btn-has-active` + dot | Route enfant, accordéon fermé |
| Admin actif | `pathname` ∈ `/administration` \| `/admin/` | `isGroupActive` si `adminNav` |

**Correspondance DOM utilisateur :**

- Administration : `orion-sb-universe-btn orion-sb-universe-btn-open orion-sb-universe-btn-active` → ouvert + page admin courante.
- Commercial : `orion-sb-universe-btn` (`aria-expanded="false"`) → fermé ; le « 6 » visible peut être le flow step ou un badge live.

---

## 4. Origine du « Commercial 6 »

Deux canaux distincts :

### A. Numérotation de flow (structurelle — la plus probable)

```ts
COMMERCIAL_FLOW_ORDER = [
  'clients', 'pos', 'panier', 'devis', 'commandes', 'reclamations'
] // length = 6
```

Dans `UniverseSubList`, si `universe.id === 'commercial'`, chaque item du flow affiche `.orion-sb-flow-step` = index+1 → **1…6**.  
Le **6** sur « Réclamations clients » = **étape 6**, pas un compteur DB.

Label flow UI documenté : partiel (`Client → POS → Devis → Commande`) vs 6 étapes réelles.

### B. Badge live univers (optionnel)

Le bouton parent peut aussi afficher `SidebarBadge` = somme `commandes + devis + reclamations` (`/api/nav/badges`).  
Si ce total vaut 6 en runtime → **coïncidence data**, canal différent du step « 6 ».

**Conclusion :** le « badge 6 » du brief = **flow commercial à 6 étapes** ; le compteur live est un autre signal.

---

## 5. Inventaire — Commercial

**Source ordre :** `UNIVERSE_MODULE_ORDER.commercial` + `COMMERCIAL_FLOW_ORDER`  
**Visibilité :** `role-registry` + `status: active` + permissions + `canAccessPage`

| # flow | moduleId | Label UI | Route | Badge live | Notes |
|--------|----------|----------|-------|------------|-------|
| 1 | `clients` | CRM Clients | `/clients` | — | |
| 2 | `pos` | Catalogue POS | `/pos` | — | `POS_PAGE_ROLES` |
| 3 | `panier` | Panier / Devis | `/panier` | — | |
| 4 | `devis` | Devis | `/devis` | `devis` (pending) | |
| 5 | `commandes` | Commandes | `/commandes` | `commandes` (urgentes/retard) | Override → univers commercial (registry group GPAO) |
| 6 | `reclamations` | Réclamations clients | `/reclamations` | `reclamations` | **Absent** du profil `commercial` |

### Hors univers Commercial (liés ventes)

| Item | Route | Univers réel |
|------|-------|--------------|
| `ws_commercial` | `/workspace/commercial` | `mon_espace` |
| Factures / Livraisons | `/factures`, `/livraisons` | finance / logistique |

### Par rôle (extrait)

| Rôle | Items Commercial visibles |
|------|---------------------------|
| admin / manager / demo (Direction) | **6** (flow complet) |
| commercial | **5** : sans `reclamations` |
| autres | sous-ensemble selon profil |

---

## 6. Inventaire — Administration

### 6.1 UI sidebar (7 macros plates)

`AdministrationMacroNav` — **aucun filtre rôle** dans le composant.

| Macro id | Label | Hub | Badge macro |
|----------|-------|-----|-------------|
| `overview` | Vue d'ensemble | `/administration/vue-ensemble` | — |
| `matieres` | Matières | CPS `?studio=matieres` | `catalogue-incomplete` |
| `prix-articles` | Articles finis | `/administration/prix-articles` | `pricing-missing` |
| `formules` | Formules & moteurs | CPS calculs/engines | `pricing-missing` |
| `production` | Production & Flux | `/administration/production-flux` | — |
| `temps` | Temps & capacités | `/administration/estimation-temps` | — |
| `org` | Organisation | 1er micro = `/admin/permissions` | `anomalies-critical` |

Les **microItems** ne sont **pas** dans la sidebar ; ils apparaissent dans le dropdown contexte page (`AdminMicroContextDropdown`).

### 6.2 Micro-items (hors sidebar / via dropdown)

| Macro | Item id | Label | Route | hidden |
|-------|---------|-------|-------|--------|
| overview | `vue-ensemble` | Vue d'ensemble | `/administration/vue-ensemble` | non |
| matieres | `materials` | Matières (supports bruts) | CPS matieres | non |
| matieres | `catalogue-prix-stock` | Catalogue, Prix & Stock (alias) | `/administration/catalogue-prix-stock` | non* |
| matieres | `prix-contexte` | Matières · Coûts | CPS couts | non* |
| matieres | `stock-achats` | Matières · Stock | CPS stock | non* |
| matieres | `excel-hub` | Import / Export Excel | CPS | **oui** |
| matieres | `anomalies-cps` | Anomalies & Doublons | CPS | **oui** |
| matieres | `parametres-formats` | Formats papier & faces | `/administration/parametres-formats-papier` | non |
| matieres | `equivalences-matieres` | Équivalences & papier épais | `/administration/equivalences-matieres` | non |
| matieres | `matieres-vierges` | Matières vierges | `/administration/matieres-vierges` | non |
| prix-articles | `prix-articles` | Articles finis | `/administration/prix-articles` | non |
| prix-articles | `articles-vente-directe` | Articles vente directe (alias) | → redirect prix-articles | **oui** |
| formules | `formulas` | Formules & moteurs | CPS engines | non |
| formules | `articles-pos` | Articles & paliers (alias) | CPS | non* |
| formules | `apercus-pos` | Aperçus POS | `/administration/apercus` | non |
| formules | `goodies-admin` | Goodies | `/administration/goodies` | non |
| formules | `textile-admin` | Textile | `/administration/textile` | non |
| formules | `impression-sf` | Impression sans finition | `/administration/impression-sf` | non |
| production | `production-flux` | Production & Flux | `/administration/production-flux` | non |
| production | `synchronisation` | Synchronisation | `/administration/synchronisation` | non |
| temps | `estimation-temps` | Temps & capacités | `/administration/estimation-temps` | non |
| org | `users` | Permissions | `/admin/permissions` | non |
| org | `roles` | Rôles | `/administration/roles-permissions` | non |
| org | `variables` | Variables | `/administration/variables` | non |
| org | `permissions` | Permissions modules | backoffice access | non* |
| org | `sites` | Annexes & sites | `/admin/annexes` | non |
| org | `import-export` | Import / Export | backoffice | non* |
| org | `banners` | Bandeaux alertes | `/admin/ticker` | non |
| org | `data-management` | Gestion des données | `/administration/data-management` | non |
| org | `logistique` | Logistique & transporteurs | `/administration/logistique` | non |
| org | `anomalies` | Anomalies | backoffice | non* |
| org | `versions` | Versions | backoffice | non |
| org | `audit` | Audit log | backoffice | non |
| org | `settings` | Paramètres POS | backoffice | non |

\*Présents code / dropdown ; pas toujours listés dans `admin-nav-config.json` (JSON = overrides).

### 6.3 Modules registry Admin (souvent avalés / hidden)

| moduleId | status | Note sidebar |
|----------|--------|--------------|
| `admin_variables_nav` | active | Avalé (`items: []`) ; exposé via micro org |
| `admin_estimation_temps` | active | Avalé ; macro `temps` |
| `admin_synchronisation` | hidden | Micro only |
| `admin_modeles_articles` | hidden | **Pas dans macros** |
| `admin_prix_nav` | hidden | href `/administration/prix` ≠ hub `/prix-articles` |

Legacy / redirects : `lib/administration/backoffice-redirects.ts` — canonique `/administration/:section`.

---

## 7. Classes CSS `orion-sb-universe-btn*`

**Sources :** `styles/sidebar-modern.css`, `app/globals.css`

| Classe | Usage |
|--------|--------|
| `.orion-sb-universe-btn` | Bouton parent univers |
| `.orion-sb-universe-btn-open` | Ouvert |
| `.orion-sb-universe-btn-active` | Ouvert + route enfant (gradient rouge ANS) |
| `.orion-sb-universe-btn-has-active` | Enfant actif, fermé |
| `.orion-sb-flow-step` | Numéros 1–6 Commercial |
| `.orion-admin-macro-nav` / `-item` | Liste Admin |
| `.orion-sb-badge` / `-badge-universe` | Compteurs live |

Écart design : radius sidebar souvent **8px** (`--sb-radius`) vs design system global **7px**.

---

## 8. Bugs / risques / dettes

### P0 — Sécurité / UX menus

1. **Univers Administration toujours injecté** pour tous les rôles (`buildSidebarUniverses`), alors que `AdministrationMacroNav` n’applique **aucun** filtre rôle. Non-admin voient 7 liens → `/non-autorise`. Contredit « Ne pas afficher tous les menus à tous les rôles ».

### P1 — Discoverabilité Admin

1. Micros absents de la sidebar (Sync, Variables, Goodies, Textile, Aperçus, Annexes, Audit…).
2. Hub `org` ouvre `/admin/permissions` (legacy), pas un hub Organisation unifié.
3. Doublon org : `users` vs `permissions`.
4. `modeles-articles` : route legacy, **aucune entrée macro**.
5. Docs : « 6 macros » vs **7** réelles.

### P1 — Commercial

1. **Réclamations** dans flow Direction, absentes du profil `commercial` → étape 6 incohérente selon rôle.
2. Label flow UI incomplet vs 6 étapes.
3. Confusion visuelle **étape « 6 »** vs **badge compteur**.

### P2 — Dettes

1. Modules admin `active` filtrés puis jetés (`items: []`) — double source.
2. Badge univers Admin parent **toujours 0** (items vides) alors que macros ont des badges.
3. CSS dupliqué ; radius 8 vs 7px.
4. Machines fusionnées dans Stock (écart vs 12 groupes docs).

---

## 9. Recommandations priorisées

| Prio | Action |
|------|--------|
| **P0** | N’ajouter `administration` que si rôle `admin`/`manager` (ou `canAccessAdmin`) |
| **P0** | Court terme : gate sur `AdministrationMacroNav` |
| **P1** | Distinguer UI étapes flow vs badge compteur |
| **P1** | Ajouter `reclamations` au profil commercial **ou** retirer du flow Direction-only |
| **P1** | Sous-nav ou liens macros pour Sync / Variables / Modèles articles |
| **P1** | MAJ `MODULES_MAP.md` : 7 macros + hubs réels |
| **P2** | Agréger badges macros sur le bouton univers Admin |
| **P2** | Unifier hub Org vers `/administration/...` |
| **P2** | Radius sidebar 7px ; dédoublonner CSS |

---

## 10. Mapping docs

| Doc | Alignement | Écart |
|-----|------------|-------|
| `docs/USER_JOURNEYS.md` | Commercial ≈ Ventes & CRM | N’indique pas Admin forcé pour tous |
| `docs/MODULES_MAP.md` | Groupes 2 / 11 ; commandes → commercial | Dit **6 macros** ; code = **7** |
| `docs/ADMIN_UI_PILES_MAP_2026-07-30.md` | MacroNav = pile A | Micros hors sidebar — OK |
| Règles `.cursor` | Admin jamais dispersé | Intention OK ; fuite menu vs page-access |

---

## 11. Fichiers clés

| Rôle | Chemin |
|------|--------|
| Composant univers | `components/layout/sidebar/sidebar-universe-nav.tsx` |
| Shell sidebar | `components/layout/orion-sidebar.tsx` |
| Nav Admin macros | `components/administration/AdministrationMacroNav.tsx` |
| Micros in-page | `components/backoffice-v2/ui/AdminMicroContextDropdown.tsx` |
| Build univers | `lib/navigation/build-sidebar-universes.ts` |
| Flow 6 Commercial | `lib/navigation/sidebar-universes.ts` |
| Actif groupe | `lib/navigation/sidebar-active.ts` |
| Badges live | `lib/navigation/nav-badges-shared.ts`, `nav-badges-service.ts` |
| Badges admin | `lib/hooks/use-admin-macro-badge-counts.ts` |
| Macros admin | `lib/administration/admin-macro-modules.ts` |
| Config JSON | `data/admin-nav-config.json` |
| Redirects | `lib/administration/backoffice-redirects.ts` |
| Registries | `lib/modules/role-registry.ts`, `module-registry.ts` |
| CSS | `styles/sidebar-modern.css`, `app/globals.css` |
| Tests | `tests/admin-macro-fusion.test.ts`, `admin-nav-discoverability.test.ts` |

---

## 12. Correspondance éléments DOM fournis

| Élément DOM | Interprétation |
|-------------|----------------|
| `div.orion-sb-universe-group[9]` + bouton Administration `…-open …-active` | Univers `administration`, ouvert, page `/administration/*` ou `/admin/*` courante |
| `div.orion-sb-universe-group[1]` + bouton Commercial | Univers `commercial`, fermé ; « 6 » = flow steps et/ou badge live |
| React `SidebarUniverseNav` | Confirmé — parent des deux boutons |

---

*Fin du rapport — fichier téléchargeable autonome.*
