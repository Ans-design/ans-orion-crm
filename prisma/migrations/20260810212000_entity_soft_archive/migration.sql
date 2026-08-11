-- Soft-archive tombstones for CRM / ops / ledger / RH list modules
ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Devis_archived_idx" ON "Devis"("archived");

ALTER TABLE "ClientReclamation" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientReclamation" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "ClientReclamation" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "ClientReclamation_archived_idx" ON "ClientReclamation"("archived");

ALTER TABLE "Commande" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Commande" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Commande" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Commande_archived_idx" ON "Commande"("archived");

ALTER TABLE "Facture" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Facture" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Facture" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Facture_archived_idx" ON "Facture"("archived");

ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Paiement_archived_idx" ON "Paiement"("archived");

ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Machine_archived_idx" ON "Machine"("archived");

ALTER TABLE "Livraison" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Livraison" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Livraison" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Livraison_archived_idx" ON "Livraison"("archived");

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "PurchaseOrder_archived_idx" ON "PurchaseOrder"("archived");

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Supplier_archived_idx" ON "Supplier"("archived");

ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Equipment_archived_idx" ON "Equipment"("archived");

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Employee_archived_idx" ON "Employee"("archived");
