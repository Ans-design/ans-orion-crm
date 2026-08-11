
```text





### 6. Articles finis & Formules

- **Articles finis :** `/administration/prix-articles` (alias `/administration/prix`) — SKU vendables, `prixBase`
- **Formules & moteurs :** studio Formules — params live + **vue fusionnée** des règles
- Runtime POS : champs config article (`forcePrice`, filtres…) ; table `BusinessRule` = **miroir d’audit** (sync), pas un 2ᵉ moteur
- API live : `/api/pricing/formules-moteurs-sync`




| `GET/POST /api/backoffice/sync-diagnostics` | Rapport drift |