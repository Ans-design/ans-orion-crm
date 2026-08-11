-- V12: enrich OutboxEvent + SyncRun / SyncRunStep (additive, SQLite-compatible)

-- OutboxEvent new columns (ignore errors if already applied via recreate)
ALTER TABLE "OutboxEvent" ADD COLUMN "aggregateVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OutboxEvent" ADD COLUMN "causationId" TEXT;
ALTER TABLE "OutboxEvent" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "OutboxEvent" ADD COLUMN "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OutboxEvent" ADD COLUMN "lockedAt" DATETIME;
ALTER TABLE "OutboxEvent" ADD COLUMN "lockedBy" TEXT;
ALTER TABLE "OutboxEvent" ADD COLUMN "lastErrorCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

CREATE TABLE IF NOT EXISTS "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "scope" TEXT,
    "requestedBy" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceVersion" TEXT,
    "targetVersion" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "SyncRun_type_status_idx" ON "SyncRun"("type", "status");
CREATE INDEX IF NOT EXISTS "SyncRun_createdAt_idx" ON "SyncRun"("createdAt");

CREATE TABLE IF NOT EXISTS "SyncRunStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "beforeHash" TEXT,
    "afterHash" TEXT,
    "errorCode" TEXT,
    "errorMsg" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SyncRunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SyncRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SyncRunStep_runId_stepKey_key" ON "SyncRunStep"("runId", "stepKey");
CREATE INDEX IF NOT EXISTS "SyncRunStep_runId_status_idx" ON "SyncRunStep"("runId", "status");
