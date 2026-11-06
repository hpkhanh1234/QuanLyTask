import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendTelegramMessage, formatAssignmentMessage, formatNewRequestMessage } from "@/lib/telegram";
import { loadTelegramConfig } from "@/lib/telegram-config";

export async function GET(req: Request) {
  try {

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const categoryId = searchParams.get("categoryId");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");
    const overdue = searchParams.get("overdue");
    const view = searchParams.get("view") || "all"; // all, new_created, transferred, assigned, completed, returned
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    const where: any = {};

    // RBAC: Requesters can only see their own requests
    if (role === "requester") {
      where.requesterId = userId;
    }

    // View-based filtering
    // Based on user's definition:
    // - "Mới khởi tạo" = status 'new' + no assignee
    // - "Đã chuyển xử lý" = status 'in_progress' + has assignee
    switch (view) {
      case "new_created":
        // Yêu cầu mới khởi tạo: status 'new' + chưa có người xử lý
        where.requesterId = userId;
        where.status = "new";
        where.assigneeId = null;
        break;
      case "transferred":
        // Đã chuyển xử lý: status 'in_progress' + đã có người xử lý
        where.requesterId = userId;
        where.status = "in_progress";
        where.assigneeId = { not: null };
        break;
      case "assigned":
        // Được giao xử lý: gán cho tôi xử lý
        where.assigneeId = userId;
        where.status = { in: ["new", "in_progress", "waiting_response"] };
        break;
      case "completed":
        // Đã hoàn thành
        where.AND = [
          { OR: [{ requesterId: userId }, { assigneeId: userId }] },
          { status: { in: ["resolved", "closed"] } },
        ];
        break;
      case "returned":
        // Bị trả lại: chờ tôi cập nhật nội dung hoặc đã hủy
        where.AND = [
          { OR: [{ requesterId: userId }, { assigneeId: userId }] },
          { status: { in: ["cancelled", "waiting_response"] } },
        ];
        break;
      // "all" — no extra filter, RBAC already applied above
    }

    // Support multiple statuses (comma-separated)
    if (status) {
      if (status.includes(",")) {
        where.status = { in: status.split(",") };
      } else {
        where.status = status;
      }
    }
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (assigneeId) where.assigneeId = assigneeId;

    // Overdue filter: deadline < now and status not resolved/closed/cancelled
    if (overdue === "true") {
      where.deadline = { lt: new Date() };
      if (!where.status) {
        where.status = { notIn: ["resolved", "closed", "cancelled"] };
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { noiDungDieuChinh: { contains: search } },
        { donVi: { contains: search } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true, email: true, image: true } },
          assignee: { select: { id: true, name: true, email: true, image: true } },
          category: { select: { id: true, name: true, color: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.request.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const {
      title, description, priority, deadline, categoryId, assigneeId,
      linkSite, donVi, linkChucNang, hienTrang, noiDungDieuChinh, quyTrinhThaoTac,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Tiêu đề là bắt buộc" },
        { status: 400 }
      );
    }

    const request = await prisma.request.create({
      data: {
        title,
        description: description || "",
        priority: priority || "medium",
        deadline: deadline ? new Date(deadline) : null,
        categoryId,
        assigneeId,
        linkSite: linkSite || null,
        donVi: donVi || null,
        linkChucNang: linkChucNang || null,
        hienTrang: hienTrang || null,
        noiDungDieuChinh: noiDungDieuChinh || null,
        quyTrinhThaoTac: quyTrinhThaoTac || null,
        requesterId: userId,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "created",
        details: JSON.stringify({ title, priority, categoryId }),
        userId,
        requestId: request.id,
      },
    });

    // Create notification for assignee
    if (assigneeId) {
      await prisma.notification.create({
        data: {
          title: "Yêu cầu mới được giao",
          message: `Bạn có yêu cầu mới: ${title}`,
          type: "assignment",
          userId: assigneeId,
          link: `/requests/${request.id}`,
        },
      });
    }

    // ── Telegram notifications ──
    const config = loadTelegramConfig();
    const requestLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/requests/${request.id}`;

    // Rule 1: When assigned → send to assignee via Telegram
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { telegramChatId: true },
      });
      if (assignee?.telegramChatId) {
        const assignMessage = formatAssignmentMessage({ title, link: requestLink });
        await sendTelegramMessage(assignee.telegramChatId, assignMessage);
      }
    }

    // Rule 3: New request → send to group
    if (config.notifyGroupChatId && config.notifyOnNewRequest) {
      const requesterName = request.requester?.name || "Không xác định";
      const newRequestMsg = formatNewRequestMessage({
        title,
        requesterName,
        priority: priority || "medium",
        link: requestLink,
      });
      await sendTelegramMessage(config.notifyGroupChatId, newRequestMsg);
    }

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
