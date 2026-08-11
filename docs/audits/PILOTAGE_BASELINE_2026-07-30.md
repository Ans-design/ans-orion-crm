# Pilotage — Baseline remédiation V5

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-30 (session remédiation) |
| Source audit | `AUDIT_PILOTAGE_2026-07-30.md` |
| Prompt | `PROMPT_CURSOR_REMEDIATION_PILOTAGE_ANS_ORION_V5.txt` |
| Git | **BLOCKED** — dépôt sans `.git` (pas de commit/branche) |
| Package manager | npm (`package-lock.json`) |

## Scripts détectés

- `typecheck` → `tsc --noEmit`
- `lint` → `next lint`
- `test` → `vitest run`
- `build` → `prisma generate && next build`
- `test:e2e` → Playwright

## Baseline commandes

| Commande | Exit | Note |
|----------|-----:|------|
| `npm run typecheck` | 0 | PASS |
| Vitest ciblé (lot-a, margin, permissions, cockpit, page-access, next-action) | 0 | 61 tests PASS |

## Routes confirmées

| Route | Fichier |
|-------|---------|
| `/dashboard` | `app/(app)/dashboard/page.tsx` |
| `/cockpit` → `/dashboard` | `next.config.js` redirect permanent |
| `/operations` | `app/(app)/operations/page.tsx` |
| `/rapports` | `app/(app)/rapports/page.tsx` |
| `/rapports/performance` | `app/(app)/rapports/performance/page.tsx` |
| `/historique` | `app/(app)/historique/page.tsx` |

## APIs confirmées

| API | État vs audit |
|-----|---------------|
| `/api/dashboard/stats` | Existe — **CK-01 marge OPEN** (pas de strip) |
| `/api/cockpit/stats` | Existe — **CK-05 roleParam OPEN** |
| `/api/reports` | Existe — strip marge/paie FIXED (V4) |
| `/api/reports/export` | Existe — **RP-01 FIXED** (V4) |
| `/api/rapports/performance` | Existe |
| `/api/audit` | Existe — pas de filtre `commande` (**HI-01 OPEN**) |

## Constats audit → état réel (pré-correction)

| ID | Audit | État baseline |
|----|-------|---------------|
| CK-01 | P0 fuite marge | **OPEN** |
| OP-01 | P0 deep-link `?id=` | **FIXED** (`/commandes/${id}`) |
| RP-01 | P0 export absent | **FIXED** |
| RP-02 | P0 paie/avances | **FIXED** API (`rh:payroll_read`) |
| CK-05 | role spoof | **OPEN** |
| OP-02 | CA atelier | **OPEN** |
| OP-03 | refresh ops | **OPEN** |
| HI-01 | `?commande=` | **OPEN** |
| HI-04 | group CM | **OPEN** (`communication_marketing`) |
| PF-01 | gate perf | à vérifier |
| CK-03 | poll 45s | **PARTIAL** (visibility OK, interval 45s) |

Permission paie réelle : `rh:payroll_read` (pas `rh:paie` littéral).

## Blocages environnement

- Pas de dépôt Git → pas de `git status` / commit / diff branch.
- E2E non exécutés en baseline (serveur + fixtures requis).
