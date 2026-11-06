import prisma from "./prisma";

export interface TelegramConfigData {
  enabled: boolean;
  notifyGroupChatId: string;
  notifyOnNewRequest: boolean;
  notifyOnStatusChange: boolean;
  notifyOnDeadline: boolean;
  notifyOnOverdue: boolean;
  autoRunCron: boolean;
  scheduledTimes: string[]; // e.g. ["08:00", "12:00", "17:00"]
  lastCronRun: string | null;
  lastManualRun: string | null;
}

const defaultConfig: TelegramConfigData = {
  enabled: false,
  notifyGroupChatId: "",
  notifyOnNewRequest: true,
  notifyOnStatusChange: true,
  notifyOnDeadline: true,
  notifyOnOverdue: true,
  autoRunCron: false,
  scheduledTimes: ["08:00", "12:00", "17:00"],
  lastCronRun: null,
  lastManualRun: null,
};

function parseScheduledTimes(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) {
      return parsed.filter((time): time is string => typeof time === "string");
    }
  } catch {
    // Fall back to the defaults below when an old/corrupt value is present.
  }
  return defaultConfig.scheduledTimes;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fromRecord(record: {
  enabled: boolean;
  notifyGroupChatId: string | null;
  notifyOnNewRequest: boolean;
  notifyOnStatusChange: boolean;
  notifyOnDeadline: boolean;
  notifyOnOverdue: boolean;
  autoRunCron: boolean;
  scheduledTimes: string;
  lastCronRun: Date | null;
  lastManualRun: Date | null;
}): TelegramConfigData {
  return {
    enabled: record.enabled,
    notifyGroupChatId: record.notifyGroupChatId || "",
    notifyOnNewRequest: record.notifyOnNewRequest,
    notifyOnStatusChange: record.notifyOnStatusChange,
    notifyOnDeadline: record.notifyOnDeadline,
    notifyOnOverdue: record.notifyOnOverdue,
    autoRunCron: record.autoRunCron,
    scheduledTimes: parseScheduledTimes(record.scheduledTimes),
    lastCronRun: record.lastCronRun?.toISOString() || null,
    lastManualRun: record.lastManualRun?.toISOString() || null,
  };
}

async function ensureTelegramConfig() {
  return prisma.telegramConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      enabled: defaultConfig.enabled,
      notifyGroupChatId: null,
      notifyOnNewRequest: defaultConfig.notifyOnNewRequest,
      notifyOnStatusChange: defaultConfig.notifyOnStatusChange,
      notifyOnDeadline: defaultConfig.notifyOnDeadline,
      notifyOnOverdue: defaultConfig.notifyOnOverdue,
      autoRunCron: defaultConfig.autoRunCron,
      scheduledTimes: JSON.stringify(defaultConfig.scheduledTimes),
    },
  });
}

export async function loadTelegramConfig(): Promise<TelegramConfigData> {
  const record = await ensureTelegramConfig();
  return fromRecord(record);
}

export async function saveTelegramConfig(
  config: TelegramConfigData
): Promise<TelegramConfigData> {
  const record = await prisma.telegramConfig.upsert({
    where: { id: 1 },
    update: {
      enabled: config.enabled,
      notifyGroupChatId: config.notifyGroupChatId || null,
      notifyOnNewRequest: config.notifyOnNewRequest,
      notifyOnStatusChange: config.notifyOnStatusChange,
      notifyOnDeadline: config.notifyOnDeadline,
      notifyOnOverdue: config.notifyOnOverdue,
      autoRunCron: config.autoRunCron,
      scheduledTimes: JSON.stringify(config.scheduledTimes),
      lastCronRun: toDate(config.lastCronRun),
    },
    create: {
      id: 1,
      enabled: config.enabled,
      notifyGroupChatId: config.notifyGroupChatId || null,
      notifyOnNewRequest: config.notifyOnNewRequest,
      notifyOnStatusChange: config.notifyOnStatusChange,
      notifyOnDeadline: config.notifyOnDeadline,
      notifyOnOverdue: config.notifyOnOverdue,
      autoRunCron: config.autoRunCron,
      scheduledTimes: JSON.stringify(config.scheduledTimes),
      lastCronRun: toDate(config.lastCronRun),
    },
  });
  return fromRecord(record);
}

export async function updateTelegramCronState(values: {
  lastCronRun?: string | null;
  lastManualRun?: string | null;
}): Promise<TelegramConfigData> {
  const record = await prisma.telegramConfig.upsert({
    where: { id: 1 },
    update: {
      ...(values.lastCronRun !== undefined
        ? { lastCronRun: toDate(values.lastCronRun) }
        : {}),
      ...(values.lastManualRun !== undefined
        ? { lastManualRun: toDate(values.lastManualRun) }
        : {}),
    },
    create: {
      id: 1,
      enabled: defaultConfig.enabled,
      notifyGroupChatId: null,
      notifyOnNewRequest: defaultConfig.notifyOnNewRequest,
      notifyOnStatusChange: defaultConfig.notifyOnStatusChange,
      notifyOnDeadline: defaultConfig.notifyOnDeadline,
      notifyOnOverdue: defaultConfig.notifyOnOverdue,
      autoRunCron: defaultConfig.autoRunCron,
      scheduledTimes: JSON.stringify(defaultConfig.scheduledTimes),
      lastCronRun: toDate(values.lastCronRun),
      lastManualRun: toDate(values.lastManualRun),
    },
  });
  return fromRecord(record);
}
