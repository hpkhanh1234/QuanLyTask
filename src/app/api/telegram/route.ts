import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getBotInfo, sendTelegramMessage } from "@/lib/telegram";

/**
 * GET /api/telegram - Get Telegram bot info and user's connection status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    const botInfo = await getBotInfo();

    return NextResponse.json({
      botInfo,
      isConnected: !!user?.telegramChatId,
      chatId: user?.telegramChatId || null,
    });
  } catch (error) {
    console.error("Error fetching Telegram info:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}

/**
 * POST /api/telegram - Connect Telegram account
 * Body: { chatId: string }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID là bắt buộc" }, { status: 400 });
    }

    // Validate chat ID by sending a test message
    const testMessage = `✅ Kết nối thành công!\n\nTài khoản: ${session.user.name}\nEmail: ${session.user.email}\n\nBạn sẽ nhận được thông báo khi:\n• Yêu cầu sắp hết hạn\n• Yêu cầu quá hạn\n• Được giao yêu cầu mới`;
    
    const sent = await sendTelegramMessage(chatId, testMessage);
    if (!sent) {
      return NextResponse.json(
        { error: "Không thể gửi tin nhắn test. Vui lòng kiểm tra Chat ID." },
        { status: 400 }
      );
    }

    // Save chat ID to user
    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: chatId },
    });

    return NextResponse.json({ success: true, message: "Kết nối Telegram thành công!" });
  } catch (error) {
    console.error("Error connecting Telegram:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}

/**
 * DELETE /api/telegram - Disconnect Telegram account
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null },
    });

    return NextResponse.json({ success: true, message: "Ngắt kết nối Telegram thành công!" });
  } catch (error) {
    console.error("Error disconnecting Telegram:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}
