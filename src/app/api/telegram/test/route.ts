import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * POST /api/telegram/test - Send test message via Telegram
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true, name: true, email: true },
    });

    if (!user?.telegramChatId) {
      return NextResponse.json(
        { error: "Chưa kết nối Telegram. Vui lòng kết nối trước." },
        { status: 400 }
      );
    }

    // Format test message
    const testMessage = `🔔 <b>Tin nhắn test từ Hệ thống Quản lý Yêu cầu</b>

Xin chào <b>${user.name}</b>!

Đây là tin nhắn kiểm tra kết nối Telegram. Nếu bạn nhận được tin nhắn này, nghĩa là hệ thống đã được cấu hình đúng.

✅ Kết nối thành công!

Các thông báo bạn sẽ nhận được:
• Yêu cầu sắp hết hạn (còn 1-2 ngày)
• Yêu cầu quá hạn
• Được giao yêu cầu mới

━━━━━━━━━━━━━━━━━━━
📧 ${user.email}
🕐 ${new Date().toLocaleString("vi-VN")}`;

    const sent = await sendTelegramMessage(user.telegramChatId, testMessage);

    if (!sent) {
      return NextResponse.json(
        { error: "Không thể gửi tin nhắn. Vui lòng kiểm tra lại Chat ID." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã gửi tin nhắn test thành công! Kiểm tra Telegram của bạn.",
    });
  } catch (error) {
    console.error("Error sending test message:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}
