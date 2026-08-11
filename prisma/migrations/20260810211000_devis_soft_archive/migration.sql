-- Soft-archive devis (corbeille)
ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Devis_archived_idx" ON "Devis"("archived");
