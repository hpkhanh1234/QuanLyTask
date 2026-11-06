import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { loadTelegramConfig, saveTelegramConfig } from "@/lib/telegram-config";

/**
 * GET /api/telegram/config - Get Telegram configuration
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await loadTelegramConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error fetching Telegram config:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}

/**
 * POST /api/telegram/config - Save Telegram configuration
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Chỉ admin mới có quyền cấu hình" }, { status: 403 });
    }

    const body = await req.json();
    
    const config = {
      enabled: body.enabled ?? false,
      notifyGroupChatId: body.notifyGroupChatId ?? "",
      notifyOnNewRequest: body.notifyOnNewRequest ?? true,
      notifyOnStatusChange: body.notifyOnStatusChange ?? true,
      notifyOnDeadline: body.notifyOnDeadline ?? true,
      notifyOnOverdue: body.notifyOnOverdue ?? true,
      autoRunCron: body.autoRunCron ?? false,
      scheduledTimes: body.scheduledTimes ?? ["08:00", "12:00", "17:00"],
      lastCronRun: body.lastCronRun ?? null,
      lastManualRun: null,
    };
    const savedConfig = await saveTelegramConfig(config);

    return NextResponse.json({ 
      success: true, 
      message: "Đã lưu cấu hình thành công!", 
      config: savedConfig
    });
  } catch (error) {
    console.error("Error saving Telegram config:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}

/**
 * PATCH /api/telegram/config - Send test notification
 */
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await loadTelegramConfig();

    const testMessage = `🔔 <b>Tin nhắn test từ Hệ thống Quản lý Yêu cầu</b>\n\nXin chào!\n\nĐây là tin nhắn kiểm tra cấu hình thông báo tự động.\n\n✅ Cấu hình đã được thiết lập!\n\nThông báo sẽ được gửi đến group:\n${config.notifyGroupChatId ? `👥 Group: ${config.notifyGroupChatId}` : "👥 Chưa cấu hình group"}\n\nNhân viên nhận tin qua Telegram đã gán ở trang Quản lý người dùng.\n\n━━━━━━━━━━━━━━━━━━━\n🕐 ${new Date().toLocaleString("vi-VN")}`;

    let sentCount = 0;
    let errors: string[] = [];

    if (config.notifyGroupChatId) {
      const sent = await sendTelegramMessage(config.notifyGroupChatId, testMessage);
      if (sent) sentCount++;
      else errors.push("Group Chat ID");
    }

    if (sentCount === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: `Không thể gửi tin nhắn đến: ${errors.join(", ")}. Kiểm tra lại Chat ID.` },
        { status: 400 }
      );
    }

    const message = errors.length > 0
      ? `Đã gửi ${sentCount} tin nhắn. Lỗi: ${errors.join(", ")}`
      : `Đã gửi tin nhắn test đến ${sentCount} nơi thành công!`;

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}
