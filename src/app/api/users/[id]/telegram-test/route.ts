import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * POST /api/users/[id]/telegram-test - Send test telegram to user
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền" },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, telegramChatId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    if (!user.telegramChatId) {
      return NextResponse.json(
        { error: "Người dùng chưa có Telegram Chat ID" },
        { status: 400 }
      );
    }

    const testMessage = `🔔 <b>Tin nhắn test từ Hệ thống Quản lý Yêu cầu</b>

Xin chào ${user.name || user.email}!

Đây là tin nhắn kiểm tra kết nối Telegram. Nếu bạn nhận được tin nhắn này, nghĩa là hệ thống đã được cấu hình đúng.

✅ Kết nối thành công!

Các thông báo bạn sẽ nhận được:
• Yêu cầu sắp hết hạn
• Yêu cầu quá hạn
• Được giao yêu cầu mới

━━━━━━━━━━━━━━━━━━━
📧 ${user.email}
🕐 ${new Date().toLocaleString("vi-VN")}`;

    const sent = await sendTelegramMessage(user.telegramChatId, testMessage);

    if (!sent) {
      return NextResponse.json(
        { error: "Không thể gửi tin nhắn. Kiểm tra lại Chat ID." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi tin nhắn test đến ${user.name || user.email} thành công!`,
    });
  } catch (error) {
    console.error("Error sending test telegram:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
