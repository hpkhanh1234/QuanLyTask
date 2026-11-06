/**
 * Scheduled .bat runner
 * - Config: data/bat-schedule.json
 * - Ticks every 30s and matches Vietnam time (Asia/Ho_Chi_Minh)
 * - Started on server boot (instrumentation.ts) and lazily from the admin API
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const CONFIG_FILE = path.join(process.cwd(), "data", "bat-schedule.json");
const VN_TIMEZONE = "Asia/Ho_Chi_Minh";
const TICK_MS = 30_000;
const RUN_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_OUTPUT_CHARS = 4000;

export type BatScheduleMode = "daily" | "weekly";
export type BatRunTrigger = "schedule" | "manual";

export interface BatRunResult {
  trigger: BatRunTrigger;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  success: boolean;
  output: string;
  error?: string;
}

export interface BatScheduleConfig {
  enabled: boolean;
  batPath: string;
  mode: BatScheduleMode;
  weekdays: number[]; // 0 = Chủ nhật, 1 = Thứ hai, ... 6 = Thứ bảy
  times: string[]; // các mốc HH:mm theo giờ Việt Nam, đã sắp xếp
  lastRunKey: string | null;
  lastRunAt: string | null;
  lastResult: BatRunResult | null;
}

export const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const defaultConfig: BatScheduleConfig = {
  enabled: false,
  batPath: "",
  mode: "daily",
  weekdays: [1, 2, 3, 4, 5],
  times: ["08:00"],
  lastRunKey: null,
  lastRunAt: null,
  lastResult: null,
};

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Lọc, bỏ trùng và sắp xếp danh sách mốc giờ HH:mm. */
export function normalizeTimes(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && TIME_PATTERN.test(value)
      )
    )
  ).sort();
}

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function loadBatScheduleConfig(): BatScheduleConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) as
        Partial<BatScheduleConfig> & { time?: string };
      const { time: legacyTime, ...rest } = parsed;
      const merged: BatScheduleConfig = { ...defaultConfig, ...rest };

      // Tương thích cấu hình cũ chỉ có một mốc `time`
      const times = Array.isArray(parsed.times)
        ? normalizeTimes(parsed.times)
        : typeof legacyTime === "string"
        ? normalizeTimes([legacyTime])
        : [];

      merged.times = times.length > 0 ? times : [...defaultConfig.times];

      return merged;
    }
  } catch (error) {
    console.error("[Bat Scheduler] Không đọc được cấu hình:", error);
  }
  return { ...defaultConfig, times: [...defaultConfig.times] };
}

export function saveBatScheduleConfig(config: BatScheduleConfig): void {
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("[Bat Scheduler] Không lưu được cấu hình:", error);
    throw new Error("Không thể lưu cấu hình chạy báo cáo");
  }
}

/** Trả về thông báo lỗi, hoặc null nếu đường dẫn hợp lệ. */
export function validateBatPath(target: string): string | null {
  const value = (target || "").trim();
  if (!value) return "Vui lòng chọn file .bat cần chạy";
  if (!path.isAbsolute(value)) {
    return "Đường dẫn phải là đường dẫn tuyệt đối, ví dụ C:\\scripts\\bao-cao.bat";
  }

  const ext = path.extname(value).toLowerCase();
  if (ext !== ".bat" && ext !== ".cmd") {
    return "Chỉ hỗ trợ file .bat hoặc .cmd";
  }

  try {
    if (!fs.statSync(value).isFile()) {
      return "Đường dẫn không trỏ tới một file";
    }
  } catch {
    return "Không tìm thấy file trên máy chủ. Kiểm tra lại đường dẫn.";
  }

  return null;
}

function getVietnamNow(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekday = WEEKDAY_SHORT[get("weekday")];

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    weekday: typeof weekday === "number" ? weekday : now.getDay(),
  };
}

/** Nhãn lần chạy kế tiếp (giờ Việt Nam), dùng để hiển thị ở UI. */
export function computeNextRun(config: BatScheduleConfig): string | null {
  if (!config.enabled || !config.batPath) return null;

  const times = normalizeTimes(config.times);
  if (times.length === 0) return null;

  const now = Date.now();

  for (let offset = 0; offset <= 7; offset++) {
    // Việt Nam không có DST nên cộng 24h là an toàn
    const day = new Date(now + offset * 24 * 60 * 60 * 1000);
    const { dateKey, weekday } = getVietnamNow(day);

    if (config.mode === "weekly" && !config.weekdays.includes(weekday)) {
      continue;
    }

    const upcoming = times
      .map((time) => ({
        time,
        at: new Date(`${dateKey}T${time}:00+07:00`).getTime(),
      }))
      .filter((slot) => slot.at > now)
      .sort((a, b) => a.at - b.at);

    if (upcoming.length > 0) {
      return `${dateKey} ${upcoming[0].time} (${WEEKDAY_LABELS[weekday]})`;
    }
  }

  return null;
}

// ── Execution ──

let isRunning = false;

export function isBatScriptRunning(): boolean {
  return isRunning;
}

function persistRunResult(result: BatRunResult): void {
  const current = loadBatScheduleConfig();
  const { dateKey, time } = getVietnamNow();
  const currentKey = `${dateKey}T${time}`;

  saveBatScheduleConfig({
    ...current,
    lastRunAt: result.finishedAt,
    lastResult: result,
    // Đánh dấu đã chạy ô thời gian hiện tại để tick 30s không chạy lặp
    lastRunKey: currentKey,
  });
}

export async function executeBat(trigger: BatRunTrigger): Promise<BatRunResult> {
  const startedAt = new Date().toISOString();
  const config = loadBatScheduleConfig();

  if (isRunning) {
    return {
      trigger,
      startedAt,
      finishedAt: startedAt,
      exitCode: null,
      success: false,
      output: "",
      error: "Script đang chạy, vui lòng chờ lần chạy hiện tại kết thúc",
    };
  }

  const pathError = validateBatPath(config.batPath);
  if (pathError) {
    const result: BatRunResult = {
      trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: null,
      success: false,
      output: "",
      error: pathError,
    };
    persistRunResult(result);
    return result;
  }

  isRunning = true;
  console.log(`[Bat Scheduler] Chạy ${config.batPath} (${trigger})`);

  try {
    const outcome = await new Promise<{
      code: number | null;
      output: string;
      error?: string;
    }>((resolve) => {
      let buffer = "";
      let settled = false;

      const finish = (value: {
        code: number | null;
        output: string;
        error?: string;
      }) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const child = spawn(config.batPath, {
        cwd: path.dirname(config.batPath),
        shell: true,
        windowsHide: true,
        timeout: RUN_TIMEOUT_MS,
        env: { ...process.env, BAT_SCHEDULE_TRIGGER: trigger },
      });

      const collect = (chunk: Buffer) => {
        buffer = (buffer + chunk.toString("utf8")).slice(-MAX_OUTPUT_CHARS * 2);
      };

      child.stdout?.on("data", collect);
      child.stderr?.on("data", collect);

      child.on("error", (error) => {
        finish({ code: null, output: buffer, error: error.message });
      });

      child.on("close", (code) => {
        finish({ code, output: buffer });
      });
    });

    const result: BatRunResult = {
      trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: outcome.code,
      success: !outcome.error && outcome.code === 0,
      output: outcome.output.trim().slice(-MAX_OUTPUT_CHARS),
      ...(outcome.error ? { error: outcome.error } : {}),
    };

    persistRunResult(result);
    console.log(
      `[Bat Scheduler] Kết thúc (${trigger}): ${
        result.success ? "OK" : "LỖI"
      }, exit code ${result.exitCode}`
    );

    return result;
  } catch (error: any) {
    const result: BatRunResult = {
      trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: null,
      success: false,
      output: "",
      error: error?.message || "Không chạy được file .bat",
    };
    persistRunResult(result);
    console.error("[Bat Scheduler] Lỗi:", error);
    return result;
  } finally {
    isRunning = false;
  }
}

// ── Scheduler ──

async function tick(): Promise<void> {
  try {
    const config = loadBatScheduleConfig();
    if (!config.enabled || !config.batPath || isRunning) return;

    const { dateKey, time, weekday } = getVietnamNow();

    if (config.mode === "weekly" && !config.weekdays.includes(weekday)) return;

    if (!config.times.includes(time)) return;

    const runKey = `${dateKey}T${time}`;
    if (config.lastRunKey === runKey) return;

    // Ghi nhận trước khi chạy để không gửi lặp nếu server khởi động lại
    saveBatScheduleConfig({ ...config, lastRunKey: runKey });

    await executeBat("schedule");
  } catch (error) {
    console.error("[Bat Scheduler] Tick lỗi:", error);
  }
}

const globalForBatScheduler = globalThis as unknown as {
  __batSchedulerStarted?: boolean;
};

export function startBatScheduler(): void {
  if (globalForBatScheduler.__batSchedulerStarted) return;
  globalForBatScheduler.__batSchedulerStarted = true;

  console.log(
    "[Bat Scheduler] Đã khởi động (kiểm tra mỗi 30s, giờ Việt Nam)"
  );

  const timer = setInterval(() => {
    void tick();
  }, TICK_MS);

  // Không giữ tiến trình sống chỉ vì bộ hẹn giờ
  timer.unref?.();

  void tick();
}
