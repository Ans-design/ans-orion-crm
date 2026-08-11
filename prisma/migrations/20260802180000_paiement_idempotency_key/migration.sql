-- DATA-006 : clé idempotente paiements (nullable unique)
ALTER TABLE "Paiement" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Paiement_idempotencyKey_key" ON "Paiement"("idempotencyKey");
