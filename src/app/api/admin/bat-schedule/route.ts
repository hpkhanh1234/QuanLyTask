import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  computeNextRun,
  executeBat,
  isBatScriptRunning,
  loadBatScheduleConfig,
  normalizeTimes,
  saveBatScheduleConfig,
  startBatScheduler,
  TIME_PATTERN,
  validateBatPath,
  type BatScheduleConfig,
  type BatScheduleMode,
} from "@/lib/bat-scheduler";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if ((session.user as any).role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền cấu hình" },
        { status: 403 }
      ),
    };
  }
  return { session };
}

/** GET /api/admin/bat-schedule - cấu hình hiện tại + lần chạy kế tiếp */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // Bảo đảm lịch chạy được bật kể cả khi instrumentation không chạy
    startBatScheduler();

    const config = loadBatScheduleConfig();

    return NextResponse.json({
      config,
      nextRun: computeNextRun(config),
      isRunning: isBatScriptRunning(),
    });
  } catch (error) {
    console.error("Error reading bat schedule:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}

/** POST /api/admin/bat-schedule - lưu cấu hình */
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();

    const mode: BatScheduleMode =
      body.mode === "weekly" ? "weekly" : "daily";

    const weekdays: number[] = Array.isArray(body.weekdays)
      ? Array.from(
          new Set<number>(
            body.weekdays.filter(
              (day: unknown): day is number =>
                Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6
            )
          )
        ).sort((a, b) => a - b)
      : [];

    if (mode === "weekly" && weekdays.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất một ngày trong tuần" },
        { status: 400 }
      );
    }

    // Chấp nhận `times` (nhiều mốc) và `time` (một mốc) để tương thích cũ
    const rawTimes: unknown[] = Array.isArray(body.times)
      ? body.times
      : typeof body.time === "string"
      ? [body.time]
      : [];

    const hasInvalidTime = rawTimes.some(
      (value) => typeof value !== "string" || !TIME_PATTERN.test(value)
    );

    if (hasInvalidTime) {
      return NextResponse.json(
        { error: "Mốc giờ không hợp lệ (định dạng HH:mm)" },
        { status: 400 }
      );
    }

    const times = normalizeTimes(rawTimes);

    if (times.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất một mốc giờ chạy" },
        { status: 400 }
      );
    }

    const enabled = Boolean(body.enabled);
    const batPath =
      typeof body.batPath === "string" ? body.batPath.trim() : "";

    if (enabled) {
      const pathError = validateBatPath(batPath);
      if (pathError) {
        return NextResponse.json({ error: pathError }, { status: 400 });
      }
    }

    const current = loadBatScheduleConfig();
    const config: BatScheduleConfig = {
      ...current,
      enabled,
      batPath,
      mode,
      weekdays: mode === "weekly" ? weekdays : [],
      times,
    };

    saveBatScheduleConfig(config);

    return NextResponse.json({
      success: true,
      message: "Đã lưu lịch chạy báo cáo",
      config,
      nextRun: computeNextRun(config),
    });
  } catch (error) {
    console.error("Error saving bat schedule:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}

/** PUT /api/admin/bat-schedule - chạy ngay file .bat */
export async function PUT() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    startBatScheduler();

    const config = loadBatScheduleConfig();
    const pathError = validateBatPath(config.batPath);
    if (pathError) {
      return NextResponse.json({ error: pathError }, { status: 400 });
    }

    const result = await executeBat("manual");

    return NextResponse.json(
      { success: result.success, result },
      { status: result.success ? 200 : 500 }
    );
  } catch (error) {
    console.error("Error running bat file:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}
