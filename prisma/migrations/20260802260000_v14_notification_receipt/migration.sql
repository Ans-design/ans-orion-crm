-- V14 Lot 1: Notification enrichie + NotificationReceipt + Talk clientMessageId / revokedAt

ALTER TABLE "Notification" ADD COLUMN "category" TEXT;
ALTER TABLE "Notification" ADD COLUMN "sourceEventId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "dedupKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN "sensitivity" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Notification" ADD COLUMN "resourceType" TEXT;
ALTER TABLE "Notification" ADD COLUMN "resourceId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupKey_key" ON "Notification"("dedupKey");
CREATE INDEX IF NOT EXISTS "Notification_category_idx" ON "Notification"("category");
CREATE INDEX IF NOT EXISTS "Notification_resourceType_resourceId_idx" ON "Notification"("resourceType", "resourceId");

CREATE TABLE IF NOT EXISTS "NotificationReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" DATETIME,
    "readAt" DATETIME,
    "ackedAt" DATETIME,
    "archivedAt" DATETIME,
    "snoozedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationReceipt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationReceipt_notificationId_userId_key" ON "NotificationReceipt"("notificationId", "userId");
CREATE INDEX IF NOT EXISTS "NotificationReceipt_userId_readAt_idx" ON "NotificationReceipt"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "NotificationReceipt_userId_createdAt_idx" ON "NotificationReceipt"("userId", "createdAt");

-- Backfill: 1 receipt par notification ciblée userId
INSERT INTO "NotificationReceipt" ("id", "notificationId", "userId", "readAt", "createdAt")
SELECT
  lower(hex(randomblob(16))),
  n."id",
  n."userId",
  CASE WHEN n."read" = 1 THEN n."createdAt" ELSE NULL END,
  n."createdAt"
FROM "Notification" n
WHERE n."userId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "NotificationReceipt" r
    WHERE r."notificationId" = n."id" AND r."userId" = n."userId"
  );

ALTER TABLE "TalkConversationMember" ADD COLUMN "revokedAt" DATETIME;
CREATE INDEX IF NOT EXISTS "TalkConversationMember_userId_revokedAt_idx" ON "TalkConversationMember"("userId", "revokedAt");

ALTER TABLE "TalkMessage" ADD COLUMN "clientMessageId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "TalkMessage_conversationId_senderId_clientMessageId_key"
  ON "TalkMessage"("conversationId", "senderId", "clientMessageId");
