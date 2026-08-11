# V14 — Campagnes CM / templates (état)

**Statut :** PARTIAL / scaffolding

- Statuts honnêtes : `NON_CONFIGURE` | `ASSISTE` | `Envoyé` (uniquement si connecteur env présent).
- Outbox types prêts : `NotificationEmailFanout`, `TalkMessageCreated`.
- Scheduling campagnes CM multi-canal : **non livré** (dépend connecteurs + worker cron dédié).
- Relances devis/factures : continuer via services métier + outbox, pas faux « Envoyé ».

Critère COM campagnes → **NOT_RUN** jusqu’à E2E + adaptateur réel.
