/**
 * Migration SQL additive — Paiement statut ledger + métadonnées (Postgres).
 * SQLite local : prisma db push.
 */

-- Statuts stockés comme TEXT côté SQLite ; enum Prisma côté client.

-- Colonnes (IF NOT EXISTS pour rejeu sûr)
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "statut" TEXT NOT NULL DEFAULT 'Valide';
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "createdByName" TEXT;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "refundOfId" TEXT;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT;

CREATE INDEX IF NOT EXISTS "Paiement_statut_idx" ON "Paiement"("statut");
CREATE INDEX IF NOT EXISTS "Paiement_refundOfId_idx" ON "Paiement"("refundOfId");
