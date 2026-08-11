-- Indexes pour recherches CRM / liste clients (archived + tri updatedAt, email, name)
CREATE INDEX "Client_email_idx" ON "Client"("email");
CREATE INDEX "Client_name_idx" ON "Client"("name");
CREATE INDEX "Client_archived_updatedAt_idx" ON "Client"("archived", "updatedAt");
