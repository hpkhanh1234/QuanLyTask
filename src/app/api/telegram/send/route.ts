import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * POST /api/telegram/send - Send custom Telegram message
 * Body: { chatId: string, message: string, type: "personal" | "group" }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { chatId, message, type } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID là bắt buộc" }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Nội dung tin nhắn là bắt buộc" }, { status: 400 });
    }

    // Validate chat ID format
    const chatIdNum = parseInt(chatId);
    if (isNaN(chatIdNum)) {
      return NextResponse.json({ error: "Chat ID phải là số" }, { status: 400 });
    }

    // For group, chat ID should be negative
    if (type === "group" && chatIdNum > 0) {
      return NextResponse.json(
        { error: "Group Chat ID phải là số âm (VD: -123456789)" },
        { status: 400 }
      );
    }

    // Send message
    const sent = await sendTelegramMessage(chatId, message);

    if (!sent) {
      return NextResponse.json(
        { 
          error: "Không thể gửi tin nhắn. Kiểm tra lại:\n" +
          "• Chat ID có đúng không?\n" +
          "• Bot có được thêm vào group không?\n" +
          "• Người nhận có đã /start với bot không?"
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi tin nhắn ${type === "group" ? "đến group" : "thành công"}!`,
    });
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}
