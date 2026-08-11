# V12 — PricingRelease (Lot 2)

## État

- Table `PricingRelease` + `PricingActivePointer` (migration additive `20260802230000_v12_pricing_release`).
- Service : [`lib/pricing/pricing-release-service.ts`](../../lib/pricing/pricing-release-service.ts) — publish / rollback monotone / outbox `PricingReleasePublished`.
- Résolveur : [`lib/pricing/canonical-price-resolver.ts`](../../lib/pricing/canonical-price-resolver.ts) — POS catalogue via `catalogue-pos-builder`.
- Flag `ALLOW_LEGACY_PRICE_FALLBACK` désactivé par défaut.

## Contrat

Publication TX : créer release → archiver précédente active → pointer singleton → Outbox.  
Rollback : nouvelle version monotone + `restoredFromVersion` — jamais réutiliser un n°.

## POS

- Lit profils publiés + moteurs dédiés via résolveur unique.
- Tant qu’aucune release n’est publiée, le runtime reste sur profils `published` (compat).
- Brouillon n’altère pas les tables live.

## Statut Lot 2

| Item | Statut |
|------|--------|
| syncAll honnête + SyncRun | PASS |
| notifyAdminModuleMutation documenté | PASS |
| Résolveur unique branché catalogue POS | PASS |
| Table PricingRelease + publish API service | PASS |
| Première release certifiée en prod / E2E Admin→POS | NOT_RUN |
| Snapshot complet enfants (matières, GF, finitions…) | PARTIAL (JSON libre) |
