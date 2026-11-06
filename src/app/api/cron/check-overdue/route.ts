import { NextResponse } from "next/server";
import { runOverdueCheckIfDue, forceRunOverdueCheck } from "@/lib/server-cron";

// GET /api/cron/check-overdue?force=true
// force=true bypasses dedup and interval check (for manual "run now" button)

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const result = force
      ? await forceRunOverdueCheck()
      : await runOverdueCheckIfDue();

    return NextResponse.json({
      success: true,
      ran: result.ran,
      force,
      stats: result.stats || {
        overdueRequests: 0,
        approachingDeadline: 0,
        notificationsSent: 0,
        errors: 0,
      },
    });
  } catch (error) {
    console.error("Error checking overdue requests:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}
