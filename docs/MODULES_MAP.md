
| 10 | Communication | ANS Talk, Campagnes, Relances, Aide | `communication_marketing` |
| 11 | Administration / Backoffice | Catalogue, Articles finis, Formules, Sync, Flux | `administration_parametres` |

> Note : le module `commandes` peut être classé `gpao_production` dans le registry pour le parcours atelier ; le parcours commercial reste Client → Devis → Commande (hub `/commandes/[id]`).
| `prix` / `prix-articles` | **Articles finis** | Prix |
| `formules` | Formules & moteurs | Prix |
| `production-flux` | Production & Flux | Santé |
| `estimation-temps` | Temps & capacités | Santé |
**UI réelle :** **7 macros** via `AdministrationMacroNav` + [`lib/administration/admin-macro-modules.ts`](../lib/administration/admin-macro-modules.ts)

1. Vue d'ensemble  
2. Matières  
3. Articles finis  
4. Formules & moteurs  
5. Production & Flux  
6. Temps & capacités  
7. Organisation  

L’univers sidebar Administration n’est monté que si `canAccessAdministration(role)` (aligné `page-access` `/administration` → admin | manager).

`overview` · `matieres` · `prix-articles` · `formules` · `production` · `org`
| Matières | Substrats, grammages | `/administration/matieres` |
| Articles finis | SKU vendables, grilles | `/administration/prix-articles` |
| Formules & moteurs | Params + règles fusionnées | `/administration/catalogue-prix-stock` (studio formules) |
| Production & flux | Flux | `/administration/production-flux` |
| Temps & capacités | Capacités atelier | `/administration/estimation-temps` |
- `/tarifs` → `/administration/prix` (alias Articles finis)