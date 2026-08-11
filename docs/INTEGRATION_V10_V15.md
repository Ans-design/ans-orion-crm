# Chaîne d’intégration ANS ORION — V10 → V15

Document d’enchaînement : **toutes les corrections des discussions restent actives et branchées**.  
Ne pas déclarer 10/10 tant que les critères E2E / matrices exhaustives sont NOT_RUN.

## Ordre d’autorité (rappel)

1. Sécurité / permissions (V10)  
2. Intégrité finance / stock / production  
3. Sync & sources de vérité (V12)  
4. Exactitude KPI (V13)  
5. Communications / Talk / alertes (V14)  
6. Responsive PC / tablette / phone (V15)  
7. Design V11  

## Lots livrés (honnêtes)

| Vague | Focus | Artefacts | Statut code |
|-------|--------|-----------|-------------|
| **V10** | Sécurité, rôles, secrets | (historique) | Socle conservé — secrets C005 BLOCKED si non validé |
| **V11** | Design system, tokens, templates | `components/ui/app-ui.ts`, spacing | PASS partiel |
| **V12** | Sync, outbox, SoT, PricingRelease | `docs/remediation-v12/` | PASS partiel — E2E NOT_RUN |
| **V13** | KPI, BusinessClock, honesty | `docs/remediation-v13/` | PASS partiel — Finance BLOCKED |
| **V14** | Notifications, Talk TX, ticker | `docs/remediation-v14/` | PASS partiel — E2E COM NOT_RUN |
| **V15** | Shell 3 modes + primitives responsive | `reports/V15_*`, `artifacts/remediation-v15/` | PASS partiel — E2E RES NOT_RUN |

## Câblage live (intégration 2026-08-02)

| Capacité | Où c’est branché |
|----------|------------------|
| Sidebar ≥1280 / rail tablette / bottom nav | `app-shell.tsx`, `TabletNavRail`, `MobileBottomNav` |
| BottomActionStack + insets CSS | `BottomActionStackProvider` dans shell |
| AlertTicker au-dessus du bottom nav | `alert-ticker.tsx` → `setLayerHeight('ticker')` |
| FAB Talk / toast offset stack | `floating-messenger-bubble.tsx` |
| POS barre mobile dans la pile | `pos-mobile-summary.tsx` → `posSummary` |
| Bottom nav masquée POS + messagerie | `mobile-nav.ts` |
| KPI dégradé dashboard | `DegradedDataBanner` + `AppResponsiveKpiGrid` |
| Listes phone cartes | `/commandes`, `/devis`, `/livraisons`, `/stock`, `/paiements`, `/clients`, `/production` (liste) |
| StickyActionBar phone | commandes, devis, clients, livraisons, stock, paiements, production, bat + workspaces |
| Plus sheet a11y | focus trap Esc sur drawer « Plus » |
| BAT public 320 | sticky Valider/Refuser + overflow-x safe |
| Flow / deep-link commande | `FlowPageBanner`, `CommandeDeepLinkBanner` |
| Sync badge | `AppSyncStateBadge` (Centre sync + ModuleHeader) |
| Exports App* Responsive | `components/ui/app-ui.ts` |

## Ce qui reste NOT_RUN (pas oublié — non certifié)

- E2E V12 SYNC / V13 KPI / V14 COM / V15 RES-09–36 (shell 01–08 + sticky amorcés)  
- Captures 10 viewports  
- Migration exhaustive 104 tables → cartes  
- DIR-006/007 Finance  

## Règle de non-régression

Toute nouvelle feature doit :

1. respecter Backoffice → DB → modules ;  
2. ne pas supprimer de route métier ;  
3. s’accrocher au hub `/commandes/[id]` si pertinent ;  
4. enregistrer les barres fixes dans `BottomActionStack` ;  
5. utiliser les breakpoints V15 (`phone <768`, `tablet 768–1279`, `desktop ≥1280`).

Verdict courant : voir `reports/V15_FINAL_VERDICT.md` + verdicts `docs/remediation-v12|v13|v14`.
