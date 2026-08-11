-- Lot B3 V4 : lien optionnel réclamation → commande (nullable, legacy conservé)
ALTER TABLE "ClientReclamation" ADD COLUMN IF NOT EXISTS "commandeId" TEXT;
CREATE INDEX IF NOT EXISTS "ClientReclamation_commandeId_idx" ON "ClientReclamation"("commandeId");
DO $$ BEGIN
  ALTER TABLE "ClientReclamation"
    ADD CONSTRAINT "ClientReclamation_commandeId_fkey"
    FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
