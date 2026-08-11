# REMEDIATION V4 — Matrice de traçabilité (à jour)

Source : `PROMPT_CURSOR_CORRECTION_AUDIT_MODULES_ANS_ORION_V4.txt`  
États : FIXED | VERIFIED-ALREADY-FIXED | VERIFIED-NOT-REPRODUCED | BLOCKED | OPEN

| ID | État | Preuve |
|----|------|--------|
| A1 BAT public | FIXED | `public-routes.ts` + tests |
| A2 Marges pricing | FIXED | `sanitize-pricing-payload.ts` |
| A3 RH paie | FIXED | `requireRhPayrollRead` |
| A4 Masse salariale | FIXED | strip + UI |
| A5 cm/finance/rh | FIXED | permissions + APIs |
| A6 Démo RH | FIXED | isDemoBlockedRoute |
| B1 BAT→GPAO | FIXED | bat/client + syncGpao |
| B2 Prépresse | FIXED | StudioPrepressCheck |
| B3–B4 SAV | FIXED | commandeId + nav commercial |
| B5 Livré→facture | FIXED | CTA + ensureFacture + preuve msg |
| B6 GPAO confirm | VERIFIED-ALREADY-FIXED | cart-service |
| B7 devis/[id] | FIXED | redirect page |
| B8 next-action | FIXED | order-next-action canon + deprecated map |
| C1–C5 Pricing | PARTIEL | contract + simulate sanitize ; POS page non découpée |
| C2 Panier | PARTIEL | CART_STORAGE_VERSION=2 ; hybrid server validate |
| C3 Livres | VERIFIED-ALREADY-FIXED | tests publication/livres |
| C6 scripts | VERIFIED-ALREADY-FIXED | dev:clean / local |
| D1 Stock page | FIXED | listStockItems paginé + suggest |
| D2 take:5000 | FIXED | take:1000 |
| D3 GPAO page | FIXED | page/pageSize |
| D4 Achats autocomplete | FIXED | suggest=1 |
| D5 Planning | FIXED | pageSize 40 |
| D6 FAB | FIXED | no pollingActive |
| D7 Rapports | FIXED | aggregates/groupBy |
| E1 Dual Production | DOC | SYNC_MATRIX |
| E2 Qualité GPAO | FIXED | etape Contrôle qualité |
| E3 BaseMaterial picker | FIXED | StockItemCompleteModal |
| E4 Drift stock/BAT | FIXED | sync-drift-service |
| F5 Aide compteur | FIXED | /api/pos/catalogue?count=1 |
| F7 Preuve livraison | FIXED | bandeau avant Livré |
| F1–F3 découpage CRM | OPEN | hors scope session |
| C4 POS extract 2751L | OPEN | hooks existent ; monolithe reste |

Tests unitaires ciblés : **38 passed** (lot-a, lot-c, permissions, page-access, margin).  
`tsc --noEmit` : OK après correctifs stock.

**Pas 10/10** — e2e 15 scénarios + `npm run build` + découpage POS/clients encore ouverts.
