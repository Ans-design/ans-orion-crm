-- Indexes recherche CRM / finance / devis (idempotent Postgres)
CREATE INDEX IF NOT EXISTS "Client_tel_idx" ON "Client"("tel");
CREATE INDEX IF NOT EXISTS "Client_nif_idx" ON "Client"("nif");
CREATE INDEX IF NOT EXISTS "Devis_validUntil_idx" ON "Devis"("validUntil");
CREATE INDEX IF NOT EXISTS "Facture_createdAt_idx" ON "Facture"("createdAt");
CREATE INDEX IF NOT EXISTS "Facture_dateEmission_idx" ON "Facture"("dateEmission");
CREATE INDEX IF NOT EXISTS "Paiement_reference_idx" ON "Paiement"("reference");
