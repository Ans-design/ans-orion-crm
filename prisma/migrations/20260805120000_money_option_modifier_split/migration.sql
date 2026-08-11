-- Money integrity — ProductOptionValue semantic split (PostgreSQL / Neon)
-- Additive only. Does NOT drop priceModifier (retrait différé).
-- Safe: nullable defaults; backfill via scripts/migrate-price-modifier-split.ts --apply
--
-- Prérequis: snapshot Neon + préflight OK (scripts/preflight-money-integrity.ts)
-- Rollback colonnes: voir docs/MONEY_MIGRATION_RUNBOOK.md (DROP COLUMN after app rollback)

ALTER TABLE "ProductOptionValue"
  ADD COLUMN IF NOT EXISTS "priceAddonAr" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProductOptionValue"
  ADD COLUMN IF NOT EXISTS "priceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0;
