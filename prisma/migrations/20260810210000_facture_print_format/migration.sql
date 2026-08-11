-- Facture.printFormat : ticket (simplifié) | facture (complète)
ALTER TABLE "Facture" ADD COLUMN IF NOT EXISTS "printFormat" TEXT NOT NULL DEFAULT 'facture';
