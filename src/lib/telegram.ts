// Telegram Bot API Service
// Documentation: https://core.telegram.org/bots/api

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: "HTML" | "Markdown";
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error("Telegram API error:", data.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

/**
 * Get bot info to verify token is valid
 */
export async function getBotInfo(): Promise<{ username: string; first_name: string } | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error("Failed to get bot info:", error);
    return null;
  }
}

/**
 * Format combined notification message (all requests in one)
 */
export function formatCombinedNotification(requests: {
  title: string;
  deadline: Date;
  link: string;
  isOverdue: boolean;
  daysLeft?: number;
}[]): string {
  if (requests.length === 0) return "";

  const now = new Date();
  const dateStr = now.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const overdue = requests.filter((r) => r.isOverdue);
  const upcoming = requests.filter((r) => !r.isOverdue);

  let msg = `<blockquote expandable>📊 <b>BÁO CÁO YÊU CẦU</b></blockquote>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📅 <i>${dateStr} ${timeStr}</i>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (overdue.length > 0) {
    msg += `🔴 <b>QUÁ HẠN (${overdue.length})</b>\n`;
    msg += `┌─────────────────────────────\n`;
    overdue.forEach((r, i) => {
      const dl = new Date(r.deadline).toLocaleDateString("vi-VN");
      const prefix = i === overdue.length - 1 ? "└" : "├";
      msg += `${prefix}─ 📋 <b>${r.title}</b>\n`;
      msg += `${i === overdue.length - 1 ? " " : "│"}   ⏰ Hạn: ${dl}\n`;
    });
    msg += "\n";
  }

  if (upcoming.length > 0) {
    msg += `🟡 <b>SẮP HẾT HẠN (${upcoming.length})</b>\n`;
    msg += `┌─────────────────────────────\n`;
    upcoming.forEach((r, i) => {
      const dl = new Date(r.deadline).toLocaleDateString("vi-VN");
      const prefix = i === upcoming.length - 1 ? "└" : "├";
      msg += `${prefix}─ 📋 <b>${r.title}</b>\n`;
      msg += `${i === upcoming.length - 1 ? " " : "│"}   ⏰ Còn ${r.daysLeft} ngày (hạn: ${dl})\n`;
    });
    msg += "\n";
  }

  const total = overdue.length + upcoming.length;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📌 <i>Tổng: ${total} yêu cầu cần xử lý</i>\n`;
  msg += `🔔 <i>Báo cáo tự động</i>`;

  return msg;
}

/**
 * Format single overdue notification message (for backward compat)
 */
export function formatOverdueMessage(request: {
  title: string;
  deadline: Date;
  link: string;
}): string {
  const deadlineStr = new Date(request.deadline).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `🚨 <b>Yêu cầu quá hạn!</b>\n\n📋 <b>${request.title}</b>\n⏰ Hạn chót: ${deadlineStr}\n\nVui lòng xử lý yêu cầu này ngay!\n\n🔗 <a href="${request.link}">Xem chi tiết</a>`;
}

/**
 * Format deadline approaching notification message
 */
export function formatDeadlineApproachingMessage(request: {
  title: string;
  deadline: Date;
  daysLeft: number;
  link: string;
}): string {
  const deadlineStr = new Date(request.deadline).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `⚠️ <b>Yêu cầu sắp hết hạn!</b>\n\n📋 <b>${request.title}</b>\n⏰ Hạn chót: ${deadlineStr}\n📅 Còn lại: ${request.daysLeft} ngày\n\nVui lòng ưu tiên xử lý!\n\n🔗 <a href="${request.link}">Xem chi tiết</a>`;
}

/**
 * Format new assignment notification message
 */
export function formatAssignmentMessage(request: {
  title: string;
  link: string;
  requesterName?: string | null;
  priority?: string;
  deadline?: Date | string | null;
  donVi?: string | null;
  noiDungDieuChinh?: string | null;
  hienTrang?: string | null;
  linkSite?: string | null;
  linkChucNang?: string | null;
  transferReason?: string | null;
}): string {
  const PRIORITY_LABELS: Record<string, string> = {
    low: "🟢 Thấp",
    medium: "🟡 Trung bình",
    high: "🟠 Cao",
    urgent: "🔴 Gấp",
  };

  let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📬 <b>BẠN ĐƯỢC GIAO VIỆC MỚI</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Title
  msg += `📋 <b>${request.title}</b>\n\n`;
  
  // Requester
  if (request.requesterName) {
    msg += `👤 <b>Người gửi:</b> ${request.requesterName}\n`;
  }
  
  // Priority
  if (request.priority) {
    msg += `⚡ <b>Ưu tiên:</b> ${PRIORITY_LABELS[request.priority] || request.priority}\n`;
  }
  
  // Unit
  if (request.donVi) {
    msg += `🏢 <b>Đơn vị:</b> ${request.donVi}\n`;
  }
  
  // Deadline
  if (request.deadline) {
    const dl = new Date(request.deadline).toLocaleDateString("vi-VN");
    msg += `⏰ <b>Hạn chót:</b> ${dl}\n`;
  }
  
  msg += `\n`;
  
  // Link/Site
  if (request.linkSite) {
    msg += `🌐 <b>Link/Site:</b> ${request.linkSite}\n`;
  }
  
  // Feature link
  if (request.linkChucNang) {
    msg += `🔗 <b>Link chức năng:</b> ${request.linkChucNang}\n`;
  }
  
  // Current status
  if (request.hienTrang) {
    msg += `\n📌 <b>Hiện trạng:</b>\n${request.hienTrang}\n`;
  }
  
  // Content to adjust
  if (request.noiDungDieuChinh) {
    msg += `\n📝 <b>Nội dung cần điều chỉnh:</b>\n${request.noiDungDieuChinh}\n`;
  }
  
  // Transfer reason
  if (request.transferReason) {
    msg += `\n💬 <b>Lý do chuyển xử lý:</b>\n${request.transferReason}\n`;
  }
  
  msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👉 Vui lòng kiểm tra và xử lý.`;
  msg += `\n🔗 <a href="${request.link}">Xem chi tiết</a>`;
  
  return msg;
}

/**
 * Format completion notification (for requester)
 */
export function formatCompletionMessage(request: {
  title: string;
  link: string;
}): string {
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>YÊU CẦU ĐÃ HOÀN THÀNH</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📋 <b>${request.title}</b>\n\nYêu cầu của bạn đã được xử lý xong.\nVui lòng xác nhận hoàn thành.\n\n🔗 <a href="${request.link}">Xem chi tiết</a>`;
}

/**
 * Format status change notification (for group)
 */
export function formatStatusChangeMessage(request: {
  title: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  link: string;
}): string {
  const STATUS_LABELS: Record<string, string> = {
    new: "🆕 Mới tạo",
    in_progress: "🔄 Đang xử lý",
    waiting: "⏳ Chờ phản hồi",
    resolved: "✅ Đã giải quyết",
    closed: "🔒 Đã đóng",
    cancelled: "❌ Đã hủy",
    returned: "↩️ Đã trả lại",
  };

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔔 <b>THAY ĐỔI TRẠNG THÁI</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📋 <b>${request.title}</b>\n\n🔄 ${STATUS_LABELS[request.oldStatus] || request.oldStatus} → ${STATUS_LABELS[request.newStatus] || request.newStatus}\n👤 Bởi: ${request.changedBy}\n\n🔗 <a href="${request.link}">Xem chi tiết</a>`;
}

/**
 * Format new request notification (for group)
 */
export function formatNewRequestMessage(request: {
  title: string;
  requesterName: string;
  priority: string;
  link: string;
}): string {
  const PRIORITY_LABELS: Record<string, string> = {
    low: "🟢 Thấp",
    medium: "🟡 Trung bình",
    high: "🟠 Cao",
    urgent: "🔴 Gấp",
  };

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📩 <b>YÊU CẦU MỚI</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📋 <b>${request.title}</b>\n\n👤 Bởi: ${request.requesterName}\n⚡ Ưu tiên: ${PRIORITY_LABELS[request.priority] || request.priority}\n\n🔗 <a href="${request.link}">Xem chi tiết</a>`;
}
