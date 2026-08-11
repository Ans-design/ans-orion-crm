# V13 — Matrice permissions KPI

| KPI | Sensibilité | Permission | Scope défaut |
|-----|-------------|------------|--------------|
| DIR-001 / FIN-004 | FINANCIAL | finance:read | session |
| DIR-006/007 | FINANCIAL | pos:view_margin | BLOCKED def |
| COM-* | OPERATIONAL | devis/clients:read | session |
| PRO-004/005 | OPERATIONAL | production:read | session / affectations |
| STK-* | OPERATIONAL | stock:read | magasin |
| RH-* | HR_SENSITIVE | rh:read | personnel→manager→RH |
| CM-006 | OPERATIONAL | talk:read | userId only |
| ADM-008 | OPERATIONAL | config:view | admin |

Règles : `lib/kpi/permissions.ts` — rôle query string ignoré (KPI102). FORBIDDEN omis ou sans `value`.
