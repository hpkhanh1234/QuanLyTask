-- Store Telegram settings and cron timestamps in PostgreSQL instead of local files.
CREATE TABLE "TelegramConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyGroupChatId" TEXT,
    "notifyOnNewRequest" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnDeadline" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnOverdue" BOOLEAN NOT NULL DEFAULT true,
    "autoRunCron" BOOLEAN NOT NULL DEFAULT false,
    "scheduledTimes" TEXT NOT NULL DEFAULT '[]',
    "lastCronRun" TIMESTAMP(3),
    "lastManualRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramConfig_pkey" PRIMARY KEY ("id")
);
