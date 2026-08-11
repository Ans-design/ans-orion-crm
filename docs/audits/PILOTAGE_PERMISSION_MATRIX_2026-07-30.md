# Pilotage — Matrice de permissions V5

Date : 2026-07-30

## Pages

| Route | Permission / page-access | Payload sensible | Refus |
|-------|--------------------------|------------------|-------|
| `/dashboard` | admin, manager, demo, finance | Marge si `pos:view_margin` | `/non-autorise` |
| `/cockpit` | redirect → `/dashboard` | idem | — |
| `/operations` | admin, manager, production, livraison, designer | CA si `canViewFinancialKPIs` | `/non-autorise` |
| `/rapports` | admin, manager | Marge / paie selon perms | 403 nav + page |
| `/rapports/performance` | admin, manager, production | Noms RH si `rh:read` | production : machines only |
| `/historique` | admin, manager | — | commercial retiré nav |

## APIs

| API | Auth | Permission | Strip |
|-----|------|------------|-------|
| `/api/dashboard/stats` | session | any of clients/commandes/production/rapports:read | marge* |
| `/api/cockpit/stats` | session | commandes/production/rapports:read | ignore `?role=` ; ops → strip CA |
| `/api/reports` | session | `rapports:read` | marge + paie |
| `/api/reports/export` | session | `rapports:export` | idem + CSV sanitize |
| `/api/rapports/performance` | session | `rapports:read` OR `production:read` | scores nominatifs |
| `/api/audit` | session | `audit:read` | filtre `commande` |

## Helpers

| Helper | Permission réelle |
|--------|-------------------|
| `canViewMargin` | `pos:view_margin` |
| `canViewPayrollAmounts` | `rh:payroll_read` |
| `canViewFinancialKPIs` | margin OR `finance:read` OR `rapports:read` |
| `canViewNamedTeamPerformance` | `rh:read` (admin inclus) |

## Rôle → home (extrait)

| Rôle | Home | Pilotage |
|------|------|----------|
| admin / manager | `/dashboard` | Oui |
| demo | `/dashboard` | Cockpit limité ; pas rapports/historique |
| finance | `/workspace/finance` (registry) ; page `/dashboard` autorisée | Partiel |
| production | `/workspace/production` | Ops + performance machines |
| commercial | `/workspace/commercial` | Non (`/dashboard` refusé) |
| designer / livraison | workspaces | Ops sans CA |

## Demo

- Pas de `rapports:read` / `audit:read` / `pos:view_margin` / `rh:payroll_read`.
- `canAccessPage('demo','/rapports')` = false → nav filtrée.
