import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============ CONFIG ============
const AI_PROVIDER = process.env.AI_PROVIDER || "ollama"; // "ollama" or "gemini"

// Ollama config
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:latest";

// Gemini config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của hệ thống QUẢN LÝ YÊU CẦU (VNPT Task Manager).

## VAI TRÒ
- Trả lời câu hỏi về hệ thống Quản lý Yêu cầu
- Trả lời câu hỏi chung về kiến thức, lịch sử, khoa học, v.v.
- Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, dễ hiểu

## THÔNG TIN HỆ THỐNG QUẢN LÝ YÊU CẦU

### Các chức năng chính:
1. **Đăng nhập**: Truy cập /login, tài khoản demo: admin@demo.com / password123
2. **Tạo yêu cầu**: Menu "Tạo yêu cầu" → Điền thông tin → Nhấn "Tạo yêu cầu"
3. **Quy trình**: 📝 Mới khởi tạo → 🔄 Đang xử lý → ✅ Đã giải quyết → 🔒 Đã đóng
4. **Chuyển xử lý**: Vào chi tiết → "Chuyển xử lý" → Chọn người xử lý
5. **Dashboard & Báo cáo**: Thống kê, biểu đồ, xuất Excel
6. **Telegram**: Cấu hình ở Admin → Cài đặt → Telegram
7. **Quản trị**: Quản lý người dùng, danh mục, ưu tiên

### Các trạng thái yêu cầu:
- 📝 Mới khởi tạo: Chưa giao xử lý
- 🔄 Đang xử lý: Đã giao cho người xử lý
- ✅ Đã giải quyết: Xong nhưng chưa đóng
- 🔒 Đã đóng: Hoàn tất
- ↩️ Bị trả lại: Người xử lý trả lại
- ❌ Đã hủy

## QUY TẮC
- Nếu câu hỏi về hệ thống → Trả lời chi tiết
- Nếu câu hỏi chung → Trả lời bình thường như AI thông thường
- Nếu không biết → Nói "Tôi không chắc chắn về thông tin này"
- Luôn trung thực, không bịa đặt
`;

// ============ DATABASE QUERIES ============

// Query tasks approaching deadline or overdue
async function getDeadlineTasks(type: "overdue" | "approaching" | "all"): Promise<any[]> {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  let where: any = {
    deadline: { not: null },
    status: { notIn: ["resolved", "closed", "cancelled"] },
  };

  if (type === "overdue") {
    where.deadline = { lt: now };
  } else if (type === "approaching") {
    where.deadline = { gte: now, lte: threeDaysLater };
  } else {
    where.deadline = { lt: threeDaysLater };
  }

  const tasks = await prisma.request.findMany({
    where,
    include: {
      requester: { select: { name: true } },
      assignee: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { deadline: "asc" },
    take: 20,
  });

  return tasks;
}

// Get task statistics
async function getTaskStats() {
  const now = new Date();
  
  const [total, newCreated, inProgress, resolved, overdue] = await Promise.all([
    prisma.request.count(),
    prisma.request.count({ where: { status: "new" } }),
    prisma.request.count({ where: { status: "in_progress" } }),
    prisma.request.count({ where: { status: "resolved" } }),
    prisma.request.count({
      where: {
        deadline: { lt: now },
        status: { notIn: ["resolved", "closed", "cancelled"] },
      },
    }),
  ]);

  return { total, newCreated, inProgress, resolved, overdue };
}

// Format deadline tasks for display
function formatDeadlineTasks(tasks: any[], type: string): string {
  if (tasks.length === 0) {
    return type === "overdue"
      ? "✅ Không có yêu cầu nào quá hạn!"
      : "✅ Không có yêu cầu nào sắp hết hạn trong 3 ngày tới!";
  }

  const now = new Date();
  let result = type === "overdue"
    ? `⚠️ **${tasks.length} yêu cầu ĐÃ QUÁ Hạn:**\n\n`
    : `⏰ **${tasks.length} yêu cầu SẮP HẾT Hạn (trong 3 ngày):**\n\n`;

  tasks.forEach((task, index) => {
    const deadline = new Date(task.deadline);
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = diffMs < 0;
    
    const urgency = isOverdue
      ? `🔴 Quá hạn ${Math.abs(diffDays)} ngày`
      : diffDays <= 1
      ? `🟡 Còn ${diffDays} ngày`
      : `🟢 Còn ${diffDays} ngày`;

    result += `${index + 1}. **${task.title}**\n`;
    result += `   - Ưu tiên: ${task.priority === "urgent" ? "🔴 Gấp" : task.priority === "high" ? "🟠 Cao" : task.priority === "medium" ? "🟡 Trung bình" : "🟢 Thấp"}\n`;
    result += `   - Hạn chót: ${deadline.toLocaleDateString("vi-VN")} (${urgency})\n`;
    result += `   - Người gửi: ${task.requester?.name || "—"}\n`;
    result += `   - Người xử lý: ${task.assignee?.name || "Chưa giao"}\n`;
    result += `   - Danh mục: ${task.category?.name || "—"}\n\n`;
  });

  return result;
}

// Check if question is about the website system
function isWebsiteQuestion(q: string): boolean {
  const l = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const keywords = [
    "tao", "chuyen", "hoan thanh", "tra lai", "dong", "binh luan",
    "bao cao", "telegram", "dang nhap", "doi mat khau", "import",
    "admin", "quan tri", "quy trinh", "workflow", "mat khau",
    "dang xuat", "login", "password", "excel", "sidebar", "menu",
    "han chot", "qua han", "sap het han", "deadline", "overdue"
  ];
  return keywords.some(k => l.includes(k));
}

// Check if question needs database query
function needsDatabaseQuery(q: string): "deadline" | "overdue" | "approaching" | "stats" | null {
  const l = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const raw = q.toLowerCase();
  
  const has = (...keywords: string[]) => keywords.some(k => l.includes(k) || raw.includes(k));

  if (has("qua han", "overdue", "tre han", "quá hạn")) return "overdue";
  if (has("sap het han", "sap den han", "sắp hết hạn", "sắp đến hạn")) return "approaching";
  if (has("han chot", "deadline")) return "deadline";
  if (has("thong ke", "statistic", "bao cao", "dashboard", "so luong", "tong so")) return "stats";
  
  return null;
}

// Call Ollama API
async function callOllama(messages: any[]): Promise<string | null> {
  try {
    console.log("[Chat] Calling Ollama:", OLLAMA_MODEL);
    
    const res = await fetch(OLLAMA_URL + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: false,
      }),
    });

    if (!res.ok) {
      console.log("[Chat] Ollama failed:", res.status);
      return null;
    }

    const data = await res.json();
    const response = data.message?.content || "";
    console.log("[Chat] Ollama response:", response.substring(0, 100));
    return response;
  } catch (e: any) {
    console.log("[Chat] Ollama error:", e.message);
    return null;
  }
}

// Call Gemini API
async function callGemini(messages: any[]): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.log("[Chat] No Gemini API key configured");
    return null;
  }

  try {
    console.log("[Chat] Calling Gemini:", GEMINI_MODEL);
    
    // Convert messages to Gemini format
    const contents = messages.slice(-10).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.log("[Chat] Gemini failed:", res.status, error.substring(0, 200));
      return null;
    }

    const data = await res.json();
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("[Chat] Gemini response:", response.substring(0, 100));
    return response;
  } catch (e: any) {
    console.log("[Chat] Gemini error:", e.message);
    return null;
  }
}

// ============ MAIN API ============
export async function POST(request: Request) {
  let messages: any[] = [];
  
  try {
    const body = await request.json();
    messages = body.messages || [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!messages.length) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const lastMsg = messages[messages.length - 1]?.content || "";
  
  console.log("[Chat] Provider:", AI_PROVIDER);
  console.log("[Chat] Received:", lastMsg);

  // Check if needs database query
  const dbQuery = needsDatabaseQuery(lastMsg);
  if (dbQuery) {
    console.log("[Chat] Database query needed:", dbQuery);
    try {
      if (dbQuery === "stats") {
        const stats = await getTaskStats();
        const response = `📊 **Thống kê tổng quan:**\n\n` +
          `- Tổng số yêu cầu: **${stats.total}**\n` +
          `- Mới khởi tạo: **${stats.newCreated}**\n` +
          `- Đang xử lý: **${stats.inProgress}**\n` +
          `- Đã giải quyết: **${stats.resolved}**\n` +
          `- Quá hạn: **${stats.overdue}** ${stats.overdue > 0 ? "⚠️" : "✅"}`;
        return NextResponse.json({ content: response, model: "database" });
      }
      
      const tasks = await getDeadlineTasks(dbQuery === "deadline" ? "all" : dbQuery);
      const response = formatDeadlineTasks(tasks, dbQuery === "deadline" ? "all" : dbQuery);
      return NextResponse.json({ content: response, model: "database" });
    } catch (error: any) {
      console.log("[Chat] Database error:", error.message);
    }
  }

  //如果是网站问题 → 用 fallback（更快）
  if (isWebsiteQuestion(lastMsg)) {
    console.log("[Chat] Using fallback for website question");
    return NextResponse.json({ content: fallback(lastMsg), model: "fallback" });
  }

  // 如果是一般问题 → 调用AI
  let aiResponse: string | null = null;

  if (AI_PROVIDER === "gemini") {
    aiResponse = await callGemini([
      { role: "user", content: lastMsg }
    ]);
  } else {
    // Default: Ollama
    aiResponse = await callOllama([
      { role: "user", content: lastMsg }
    ]);
  }

  // 如果AI回答成功
  if (aiResponse) {
    return NextResponse.json({ 
      content: aiResponse, 
      model: AI_PROVIDER === "gemini" ? GEMINI_MODEL : OLLAMA_MODEL 
    });
  }

  // Fallback nếu cả hai đều fail
  console.log("[Chat] AI failed, using fallback");
  return NextResponse.json({ content: fallback(lastMsg), model: "fallback" });
}

// ============ FALLBACK RESPONSES ============
function fallback(q: string): string {
  const l = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const raw = q.toLowerCase();
  
  const has = (...keywords: string[]) => keywords.some(k => l.includes(k) || raw.includes(k));
  
  if (has("xin chao", "hello", "chao", "hi"))
    return "Xin chào! 👋\n\nTôi là trợ lý AI của hệ thống Quản lý Yêu cầu.\n\nBạn cần giúp gì? Hãy hỏi tôi về:\n- 📝 Tạo yêu cầu\n- 🔄 Quy trình xử lý\n- 🔄 Chuyển xử lý\n- ✅ Hoàn thành yêu cầu\n- 💬 Bình luận\n- 📊 Báo cáo\n- 📱 Telegram\n- 🔐 Đăng nhập / Đổi mật khẩu";
  
  if (has("doi mat khau", "mat khau", "password", "change password", "doi mk"))
    return "🔑 **Đổi mật khẩu:**\n\n1. Click icon 🔑 trên Header (bên phải)\n2. Nhập mật khẩu hiện tại\n3. Nhập mật khẩu mới (tối thiểu 6 ký tự)\n4. Xác nhận mật khẩu mới\n5. Nhấn \"Đổi mật khẩu\"";

  if (has("tao", "new", "them", "create", "moi"))
    return "📝 **Tạo yêu cầu mới:**\n\nCác bước thực hiện:\n1. Click menu \"Tạo yêu cầu\" trên Sidebar bên trái\n2. Điền thông tin:\n   - Tiêu đề yêu cầu (bắt buộc)\n   - Link/Site\n   - Đơn vị\n   - Danh mục\n   - Nội dung cần điều chỉnh (bắt buộc)\n   - Mức độ ưu tiên (Thấp/Trung bình/Cao/Gấp)\n   - Hạn chót\n3. Nhấn nút \"Tạo yêu cầu\" để hoàn tất\n\nSau khi tạo, yêu cầu sẽ ở trạng thái \"Mới khởi tạo\" và chờ chuyển xử lý.";
  
  if (has("quy trinh", "workflow", "luong", "trang thai", "quy trinh xu ly"))
    return "🔄 **Quy trình xử lý yêu cầu:**\n\n📝 Mới khởi tạo → 🔄 Đang xử lý → ✅ Đã giải quyết → 🔒 Đã đóng\n\nCác trạng thái khác:\n- ↩️ Bị trả lại: Khi người xử lý trả lại để người tạo cập nhật\n- ❌ Đã hủy: Yêu cầu bị hủy\n\nThao tác theo trạng thái:\n- Mới khởi tạo: Chuyển xử lý, Chỉnh sửa, Xóa\n- Đang xử lý: Chuyển xử lý, Trả lại, Bình luận, Hoàn thành\n- Đã giải quyết: Đóng, Yêu cầu xử lý lại\n- Bị trả lại: Chuyển xử lý, Chỉnh sửa, Xóa";
  
  if (has("chuyen", "giao", "assign", "xu ly", "chuyen xu ly"))
    return "🔄 **Chuyển xử lý yêu cầu:**\n\nCác bước:\n1. Vào chi tiết yêu cầu (click vào tên yêu cầu)\n2. Nhấn nút \"Chuyển xử lý\" bên phải\n3. Chọn 1 hoặc nhiều người xử lý (checkbox)\n4. Nhập lý do chuyển (tùy chọn)\n5. Nhấn \"Chuyển xử lý\" để xác nhận\n\nHệ thống sẽ tự động gửi tin nhắn Telegram cho người được giao.";
  
  if (has("hoan thanh", "xong", "resolved", "giai quyet", "hoan tat"))
    return "✅ **Đánh dấu hoàn thành:**\n\nChỉ người được giao xử lý (Agent) mới có thể đánh dấu hoàn thành.\n\nCác bước:\n1. Vào chi tiết yêu cầu\n2. Nhấn nút \"Đánh dấu hoàn thành\"\n3. Xác nhận\n\nHệ thống sẽ gửi tin nhắn Telegram cho người tạo yêu cầu.";
  
  if (has("tra lai", "return", "tra loi"))
    return "↩️ **Trả lại yêu cầu:**\n\nKhi người xử lý cần người tạo cập nhật nội dung:\n\n1. Vào chi tiết yêu cầu\n2. Nhấn nút \"Trả lại người tạo\"\n3. Nhập lý do trả lại\n4. Xác nhận\n\nYêu cầu sẽ chuyển về trạng thái \"Bị trả lại\" và người tạo có thể chỉnh sửa.";
  
  if (has("dong", "close", "ket thuc"))
    return "🔒 **Đóng yêu cầu:**\n\nSau khi yêu cầu được giải quyết:\n\n1. Người tạo xem kết quả\n2. Nếu hài lòng → nhấn \"Xác nhận hoàn thành\" → Yêu cầu chuyển sang \"Đã đóng\"\n3. Nếu chưa hài lòng → nhấn \"Yêu cầu xử lý lại\" → Yêu cầu quay lại \"Đang xử lý\"";
  
  if (has("binh luan", "comment", "trao doi", "thao luan", "phan hoi"))
    return "💬 **Bình luận trên yêu cầu:**\n\n1. Vào chi tiết yêu cầu\n2. Kéo xuống phần \"Thảo luận\"\n3. Nhập nội dung bình luận\n4. Nhấn \"Gửi\"\n\nLưu ý:\n- Ghi chú nội bộ (chỉ người xử lý thấy): Chọn checkbox \"Ghi chú nội bộ\"\n- Bình luận thường: Tất cả đều thấy";
  
  if (has("bao cao", "report", "thong ke", "dashboard", "statistic", "bieu do"))
    return "📊 **Báo cáo & Thống kê:**\n\nDashboard Tổng quan:\n- Xem số lượng yêu cầu theo trạng thái\n- Biểu đồ theo ưu tiên, danh mục\n- Click vào số lượng để xem danh sách chi tiết\n\nBáo cáo hiệu suất:\n- Thời gian xử lý trung bình\n- Tỷ lệ hoàn thành đúng hạn (SLA)\n\nXuất dữ liệu:\n- Click \"Xuất Excel\" để tải file\n- Hỗ trợ xuất danh sách yêu cầu hoặc báo cáo";
  
  if (has("telegram", "thong bao"))
    return "📱 **Cấu hình Telegram:**\n\nChỉ Admin mới có thể cấu hình.\n\nCác bước:\n1. Vào menu \"Cài đặt\" trên Sidebar\n2. Chọn tab \"Telegram\"\n3. Nhập Bot Token (từ @BotFather)\n4. Nhập Chat ID (group hoặc cá nhân)\n5. Cấu hình lịch gửi thông báo\n6. Nhấn \"Lưu cấu hình\"\n\nCác loại thông báo:\n- Khi có yêu cầu mới được giao → Gửi cho người xử lý\n- Khi yêu cầu hoàn thành → Gửi cho người tạo\n- Khi thay đổi trạng thái → Gửi cho group\n- Yêu cầu sắp hết hạn/quá hạn → Gửi theo lịch";
  
  if (has("dang nhap", "login", "dang xuat", "logout", "dang ky"))
    return "🔐 **Đăng nhập/Đăng xuất:**\n\nĐăng nhập:\n1. Truy cập trang Login\n2. Nhập Email và Mật khẩu\n3. Nhấn \"Đăng nhập\"\n\nĐăng xuất:\n- Click avatar trên Header → Chọn \"Đăng xuất\"\n\nTài khoản demo:\n- Admin: admin@demo.com / password123\n- Agent: agent1@demo.com / password123\n- User: user1@demo.com / password123";
  
  if (has("import", "excel", "nhap", "file"))
    return "📥 **Import yêu cầu từ Excel:**\n\n1. Vào trang \"Tạo yêu cầu\"\n2. Click nút \"Import từ Excel\"\n3. Chọn file Excel (.xlsx)\n4. Xem trước dữ liệu\n5. Xác nhận import\n\nFile mẫu:\n- Download template Excel từ hệ thống\n- Điền thông tin theo cột mẫu";
  
  if (has("admin", "quan tri", "cau hinh"))
    return "⚙️ **Quản trị hệ thống:**\n\nMenu quản trị (chỉ Admin):\n- Quản lý người dùng: Thêm/sửa/xóa tài khoản, phân quyền\n- Quản lý danh mục: Thêm/sửa/xóa danh mục yêu cầu\n- Quản lý ưu tiên: Thêm/sửa/xóa mức độ ưu tiên\n- Cài đặt Telegram: Cấu hình bot và lịch thông báo\n- Hướng dẫn sử dụng: Tài liệu hướng dẫn toàn hệ thống";
  
  if (has("ho tro", "help", "giup", "huong dan"))
    return "❓ **Hỗ trợ:**\n\nTôi có thể giúp bạn:\n- Hướng dẫn sử dụng các tính năng\n- Giải thích quy trình xử lý\n- Hướng dẫn thao tác trên giao diện\n- Cấu hình hệ thống\n\nHãy đặt câu hỏi cụ thể để tôi hỗ trợ tốt hơn!";

  // Default - trả lời trung thực
  return "Tôi không có thông tin về \"" + q + "\".\n\nTôi chỉ hỗ trợ thông tin về hệ thống **Quản lý Yêu cầu** này. Bạn có thể hỏi:\n\n📝 Tạo yêu cầu - Cách tạo yêu cầu mới\n🔄 Quy trình - Luồng xử lý yêu cầu\n🔄 Chuyển xử lý - Cách giao việc cho người khác\n✅ Hoàn thành - Đánh dấu yêu cầu xong\n💬 Bình luận - Thảo luận trên yêu cầu\n📊 Báo cáo - Thống kê & xuất dữ liệu\n📱 Telegram - Cấu hình thông báo\n🔐 Đăng nhập / Đổi mật khẩu\n⚙️ Quản trị - Cấu hình hệ thống";
}
