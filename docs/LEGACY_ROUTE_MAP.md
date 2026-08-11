# Legacy route map ANS ORION

Date : 2026-07-30 · Zéro suppression tant qu’usage ou deep-link possible.

| Ancienne route | Destination | Auth | Suppression future |
|----------------|-------------|------|--------------------|
| `/admin-control` | `/administration/vue-ensemble` (+ tabs query) | session admin | après télémétrie 90j = 0 |
| `/admin/pricing` | tabs → sections administration | session | idem |
| `/admin/apercus` | `/administration/apercus` | session | garder alias court |
| `/admin/matieres` | `/administration/matieres` | session | permanent OK |
| `/ans-talk`, `/chat` | `/messagerie` | session | garder |
| `/tarifs` | `/administration/prix` | session | garder |
| `/gpao`, `/kanban` | `/production` | session | garder |
| `/catalogue-pos` | `/pos` | session | garder |
| `/parametres/regles` | CPS calculs/règles | session | garder |
| `/admin/permissions` | page matrice (canonique actuelle) | users:manage | ne pas rediriger |
| `/admin/annexes` | page sites | settings | ne pas rediriger |
| `/admin/ticker` | bandeaux | settings | ne pas rediriger |

Source redirects : `next.config.js` + `lib/administration/backoffice-redirects.ts`.
