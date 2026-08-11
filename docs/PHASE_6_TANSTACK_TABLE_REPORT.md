# Phase 6 — Tableaux TanStack

**Date :** 2026-06-24  
**Statut :** Intégré  
**Dépendance ajoutée :** `@tanstack/react-table@^8`

---

## Objectif

Standardiser les listes denses sur **TanStack Table**, via le composant `OrionColumnTable`, avec tri colonne et virtualisation fenêtrée pour les grands jeux de données.

---

## Infrastructure

| Fichier | Rôle |
|---------|------|
| `lib/orion/table-columns.ts` | `OrionSimpleColumn`, `toOrionColumnDefs()` |
| `components/orion/orion-column-table.tsx` | Tableau TanStack + `useWindowedRows` (seuil 60 lignes) |
| `components/ui/data-table.tsx` | Délègue à `OrionColumnTable` (rétrocompat) |

### Fonctionnalités `OrionColumnTable`

- Tri colonne (`enableSorting` global + par colonne)
- Clic ligne (`onRowClick`)
- Virtualisation scroll (réutilise `useWindowedRows`)
- Styles ORION (`orion-ds-table-wrap`, sous-composants `Table*`)

---

## Pages migrées

| Module | Changement |
|--------|------------|
| **Clients** | `DataTable` → `OrionColumnTable` + tri (nom, CA, solde) |
| **Stock** | Table HTML inline → `OrionColumnTable` + tri (SKU, libellé, qté, seuil) |
| **Devis** | Nouveau mode **Tableau** (toggle Liste / Tableau) |
| **Commandes** | Nouveau mode **Tableau** (Liste / Tableau / Kanban) |

---

## Convention

```tsx
import { OrionColumnTable } from '@/components/orion';

<OrionColumnTable
  data={rows}
  rowKey={(r) => r.id}
  enableSorting
  columns={[
    { id: 'name', accessorKey: 'name', enableSorting: true, header: 'Nom', cell: (r) => r.name },
  ]}
/>
```

L’alias `DataTable` (`@/components/ui/data-table`) reste utilisable ; les colonnes utilisent désormais `id` (et non `key`).

---

## Tests

- `tests/orion-table.test.ts` — mapping colonnes TanStack
- `tests/use-windowed-rows.test.ts` — virtualisation (existant)
- Suite complète : **963 tests** (961 + 2 nouveaux)

---

## Vérifications

```bash
npm run typecheck   # OK
npm run test        # OK
```

---

## Prochaine étape — Phase 7

Data management / qualité des données / administration unifiée.
