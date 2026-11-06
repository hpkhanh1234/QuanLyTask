import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "telegram-config.json");

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
};

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Load Telegram config from file
 */
export function loadTelegramConfig(): TelegramConfigData {
  try {
    ensureDataDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...defaultConfig, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error("Error loading Telegram config:", error);
  }
  return defaultConfig;
}

/**
 * Save Telegram config to file
 */
export function saveTelegramConfig(config: TelegramConfigData): void {
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving Telegram config:", error);
    throw new Error("Không thể lưu cấu hình");
  }
}
