# Audit grilles & alignements — ANS ORION

Date : juin 2026

---

## Problème principal (cockpit / dashboard)

### « Clients par ville » mal aligné

**Cause :** `span={4}` alors que les cartes voisines comparables utilisaient `span={6}`.

| Ligne analytics | Cartes | Total colonnes |
|-----------------|--------|----------------|
| Row A | Dépenses (6) + Top clients (6) | 12 ✓ |
| Row B | CA commercial (6) + **Clients par ville (4)** | **10 ✗** |
| Row C | CA ville (4) + Canal vente (4) + Canal découverte (4) | 12 ✓ |

La row B laissait **2 colonnes vides** à droite → carte étroite, décalée, hauteur visuelle incohérente.

**Correction :** `Clients par ville` → `span={6}` + sous-titre « Répartition géographique ».

---

## Système de grille unifié

**Nouveau fichier :** `styles/layout-grid.css`

| Classe | Rôle |
|--------|------|
| `.dashboard-grid` | Grille 12 colonnes, `align-items: stretch` |
| `.card-span-{3,4,6,8,12}` | Spans standardisés |
| `.dashboard-module-grid` | Board modules — 2/3/4 cols égales (responsive) |
| `.dashboard-chart-card` | Carte flex colonne, hauteur homogène par ligne |
| `.dashboard-chart-card-header` | Titre + actions |
| `.dashboard-chart-card-body` | Contenu `min-height: 200px` |

**Constantes TS :** `lib/design/spacing-system.ts` → `ORION_DASHBOARD_SPAN`, `ORION_GRID_DASHBOARD`.

### Règle spans

Chaque **ligne logique** doit totaliser **12 colonnes** :
- Paire analytics : `6 + 6`
- Trio analytics : `4 + 4 + 4`
- Pleine largeur : `12`

---

## Autres corrections dashboard

| Zone | Problème | Correction |
|------|----------|------------|
| Vue **Executive** — annonces / devis / RH | Grille Tailwind ad hoc `xl:grid-cols-3` | `dashboard-grid` + `card-span-4` × 3 |
| Vue **Operations** — Opérations rapides | `card-span-6` seul sur dernière ligne (6 cols vides) | `card-span-12` + grille 4 cols interne |
| Vue **Operations** — Activity feed | Wrapper sans carte | `dashboard-chart-card card-span-6` |
| **Board synthesis** | 13 modules × `span-3` → orphelin ligne 4 | `dashboard-module-grid` (colonnes égales) |
| **ChartCard** | Header/contenu non structurés | Header/body flex standardisés |
| **RhPointagePanel** | Double bordure si imbriqué | Prop `embedded` |

---

## Responsive

| Breakpoint | Comportement |
|------------|--------------|
| ≤ 1200px | span 3/4 → 6 ; span 6/8 → 12 |
| ≤ 768px | Tous les items → span 12 |

---

## Fichiers modifiés

- `styles/layout-grid.css` (nouveau)
- `app/globals.css` (import)
- `app/(app)/dashboard/page.tsx`
- `components/dashboard/chart-widgets.tsx`
- `components/dashboard/board-synthesis.tsx`
- `components/cockpit/rh-pointage-panel.tsx`
- `lib/design/spacing-system.ts`

---

## Zones à surveiller (prochaines itérations)

Modules utilisant encore des grilles ad hoc (`grid-cols-*` sans spans 12) :
- `rapports/performance/page.tsx` — ChartCard local
- Formulaires multi-colonnes (`ORION_GRID_FORM` déjà défini)
- POS catalogue (`grid-cols-2…5`) — logique métier catalogue, OK
- Panier `xl:grid-cols-[1fr_360px]` — layout 2 zones, OK

Recommandation : pour tout **nouveau widget analytics**, utiliser `ChartCard` + spans documentés.

---

## Validation

- [x] Clients par ville aligné avec Top clients / CA commercial (6+6)
- [x] Cartes analytics même hauteur par ligne (flex stretch)
- [x] Board modules colonnes égales
- [x] Operations sans ligne orpheline 6 cols
- [x] Structure header/body homogène sur ChartCard
