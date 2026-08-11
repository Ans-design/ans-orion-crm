# V14 — Baseline Communications / ANS Talk / Alertes

**Date :** 2026-08-02  
**Vitest ciblé :** 7 fichiers, **75 PASS** (constantes/validation — **non** certification COM001–180)

```bash
npx vitest run tests/ans-talk.test.ts tests/ans-talk-demo.test.ts \
  tests/ans-talk-polling.test.ts tests/ans-talk-roles.test.ts \
  tests/team-communication.test.ts tests/email-service.test.ts \
  tests/api-validation-modules.test.ts --reporter=dot
```

## P0 confirmés

| ID | Statut baseline |
|----|-----------------|
| P0-01 Notification.read global | FAIL |
| P0-02 markRead by ids sans scope | FAIL |
| P0-04/05 createNotification + email fan-out | FAIL |
| P0-10 CM Envoyé faux | FAIL |
| P0-12/13 Talk non atomique / pas d’idempotency | FAIL |
| P0-15/16 GET side-effects | FAIL |
| P0-30/35 ticker clients:read / € drawer | FAIL |
| FAB → /messagerie only | PASS |

Artefact inventaire : `artifacts/remediation-v14/comms-inventory.json` (si script exécuté).

**Migrate :** SQL additif `20260802260000_v14_notification_receipt` — `prisma migrate deploy` bloqué localement (lock `postgresql` vs schéma `sqlite`, même contrainte V12). Appliquer via `prisma db execute --file …` en local SQLite ; Postgres prod via migrate standard.
