
| Backoffice Articles finis | POS | `prixBase` publié | Publication profil | Affichage « À partir de » (Excel legacy seulement si DB absente + flag) | Obligatoire | Prix Excel écrase DB |
| Config article (forcePrice, filtres…) | POS runtime | champs configurateur | Sauvegarde config | Comportement caisse | Obligatoire | Règles non appliquées |
| Sync `BusinessRule` (miroir) | Formules & Admin Règles | lignes audit / templates | `syncReglesFromCatalogue` / formules-moteurs-sync | Vue fusionnée Formules ; liste brute Admin Règles — **pas** moteur POS | Recommandé | Confusion compteurs |
| Formules & moteurs (UI) | Variables / profils | params live + règles fusionnées | Publish / sync API | Overlay DB ; localStorage = brouillon UI | Recommandé | Opérateur croit POS à jour |

---

## Production vs ProductionDossier (Lot E1 V4)

| Modèle | UI canonique | API | Sync |
|--------|--------------|-----|------|
| `ProductionDossier` + étapes | `/production/dossiers` GPAO | `/api/production/dossiers` | Source de vérité jalons atelier |
| `Production` (kanban) | `/production` | `/api/productions` | Vue atelier parallèle — **ne pas supprimer** ; lier via `productionId` optionnel |
| Direction de sync | Confirmation commande → `syncDossierForCommande` ; BAT → `syncGpaoOnProofStatus` | idempotent | Drift BAT↔GPAO / Stock↔BaseMaterial / **Kanban↔GPAO** (`detectProductionKanbanGpaoDrift`) dans `sync-drift-service` |
Depuis `/administration/synchronisation` (`SyncUnifiedWorkspace` + `SyncCenterPanel`) :
| Action UI | Endpoint |
|-----------|----------|
| Sync POS / catalogue publié | `POST /api/admin-backoffice/pricing/sync-pos` |
| Sync config catalogue (admin-config) | `POST /api/admin-config/sync-catalog` |
| Importer catalogue → profils DB | `POST /api/admin-backoffice/articles/sync-catalogue` (alias legacy `POST /api/backoffice/articles/sync-catalogue`) |
| Réanalyser / détails drift | `GET /api/admin-backoffice/sync-diagnostics` (`runFullSyncDriftAnalysis` + diagnostics Prix↔Devis / Stock↔POS) |
| Resync acomptes ↔ ledger | `POST /api/admin-backoffice/repair-payment-drift` |
| **Ignorer 24 h** (par alerte) | `POST /api/admin-backoffice/ignore-sync-drift` `{ alertId, hours? }` → `systemConfig.sync_drift_ignored_alerts` |
| Corriger / Ouvrir module | Lien `alert.href` vers section Backoffice ou module |

Notifications drift (cron/ticker) : dédoublonnage fingerprint 24 h via `systemConfig.sync_drift_alert_state` (`notifySyncDriftIfNeeded`).
curl http://localhost:3000/api/admin-backoffice/sync-diagnostics