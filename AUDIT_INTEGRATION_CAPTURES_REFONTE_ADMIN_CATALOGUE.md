# AUDIT intégration — captures refonte Admin Catalogue Prix & Stock

Date: 2026-07-14

## Ce qui a été branché (réel)

| Élément | État |
|---------|------|
| Nav 8 studios (`CatalogStudioNav`) | Oui — `?studio=` + `?tab=` legacy |
| Cockpit KPI | Oui — `GET /api/admin/catalogue/cockpit` (Prisma + pos-catalog-index) |
| Cartes familles Prix | Oui — `PricingFamilyCards` (liens packaging inclus) |
| Workspaces métier embédés | Oui — `PrixMatieresStockWorkspace` / Catalogue POS / Excel / Anomalies |
| Formules prix | **Non modifiées** |

## Capture checklist manuelle

- [ ] `/administration/catalogue-prix-stock` → Cockpit + KPI numériques
- [ ] Studio Articles → catalogue + chips
- [ ] Studio Matières → matières / prix contexte / stock
- [ ] Studio Prix → cartes familles + sous-onglets ISF…règles
- [ ] Studio Finitions / Excel / Anomalies / Historique
- [ ] Sync POS en-tête → toast succès/erreur réel
- [ ] Deep-link `?tab=isf` → studio prix

## Non fait (phases suivantes)

- Fiche article 3 colonnes unifiée
- Centre Excel full multi-feuilles UX
- Masquer complètement l’ancienne barre 19 pills (déjà remplacée par studios + sous-tabs)
