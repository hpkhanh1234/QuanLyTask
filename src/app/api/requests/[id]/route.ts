import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { STATUS_FLOW } from "@/lib/types";
import { sendTelegramMessage, formatAssignmentMessage, formatCompletionMessage, formatStatusChangeMessage } from "@/lib/telegram";
import { loadTelegramConfig } from "@/lib/telegram-config";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    const request = await prisma.request.findUnique({
      where: { id: params.id },
      include: {
        requester: { select: { id: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, name: true, email: true, image: true } },
        category: true,
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        auditLogs: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: true,
        assignments: {
          where: { status: "active" },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu" },
        { status: 404 }
      );
    }

    // RBAC check
    if (
      role === "requester" &&
      request.requesterId !== userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Filter out internal comments for requesters
    if (role === "requester") {
      (request as any).comments = request.comments.filter(
        (c) => !c.isInternal
      );
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    const body = await req.json();

    const existingRequest = await prisma.request.findUnique({
      where: { id: params.id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu" },
        { status: 404 }
      );
    }

    // RBAC check
    if (
      role === "requester" &&
      existingRequest.requesterId !== userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {};
    const auditDetails: any = {};

    // Status change
    if (body.status && body.status !== existingRequest.status) {
      // Requester can ONLY: confirm completion (resolved → closed) or reject (resolved → in_progress)
      // OR when assigning to their own request (new/cancelled → in_progress)
      if (role === "requester") {
        const isAssigning = body.assigneeIds !== undefined || body.assigneeId !== undefined;
        const isOwnRequest = existingRequest.requesterId === userId;
        
        const requesterAllowed: Record<string, string[]> = {
          resolved: ["closed", "in_progress"],
          new: isAssigning && isOwnRequest ? ["in_progress"] : [],
          cancelled: isAssigning && isOwnRequest ? ["in_progress"] : [],
        };
        const allowed = requesterAllowed[existingRequest.status];
        if (!allowed?.includes(body.status)) {
          return NextResponse.json(
            { error: "Bạn không có quyền thay đổi trạng thái này" },
            { status: 403 }
          );
        }
      } else {
        // Agent/Admin: check STATUS_FLOW
        const allowedTransitions =
          STATUS_FLOW[existingRequest.status as keyof typeof STATUS_FLOW];
        if (!allowedTransitions?.includes(body.status)) {
          return NextResponse.json(
            {
              error: `Không thể chuyển từ trạng thái "${existingRequest.status}" sang "${body.status}"`,
            },
            { status: 400 }
          );
        }
      }

      updateData.status = body.status;
      auditDetails.oldStatus = existingRequest.status;
      auditDetails.newStatus = body.status;

      if (body.status === "resolved") {
        updateData.resolvedAt = new Date();
      }
      if (body.status === "closed") {
        updateData.closedAt = new Date();
      }
    }

    // Assignment - support both single and multiple assignees
    if (body.assigneeIds !== undefined || body.assigneeId !== undefined) {
      // Requester can only assign when: own request + status is new or returned
      if (role === "requester") {
        const canAssign =
          existingRequest.requesterId === userId &&
          ["new", "returned"].includes(existingRequest.status);
        if (!canAssign) {
          return NextResponse.json(
            { error: "Bạn không có quyền gán người xử lý" },
            { status: 403 }
          );
        }
      }
      
      // Handle multiple assignees (new) or single assignee (backward compat)
      const assigneeIds: string[] = body.assigneeIds || (body.assigneeId ? [body.assigneeId] : []);
      const primaryAssigneeId = assigneeIds[0] || null;
      
      updateData.assigneeId = primaryAssigneeId;
      
      // When assigning, also change status to in_progress
      if (!body.status && existingRequest.status === "new") {
        updateData.status = "in_progress";
        auditDetails.oldStatus = existingRequest.status;
        auditDetails.newStatus = "in_progress";
      }
      if (!body.status && existingRequest.status === "returned") {
        updateData.status = "in_progress";
        auditDetails.oldStatus = existingRequest.status;
        auditDetails.newStatus = "in_progress";
      }
      
      auditDetails.oldAssignee = existingRequest.assigneeId;
      auditDetails.newAssignees = assigneeIds;
      auditDetails.isMultiAssign = assigneeIds.length > 1;
      
      if (body.transferReason) {
        auditDetails.transferReason = body.transferReason;
      }
    }

    // Title/description update
    if (body.title) {
      updateData.title = body.title;
    }
    if (body.description) {
      updateData.description = body.description;
    }
    if (body.priority) {
      updateData.priority = body.priority;
      auditDetails.oldPriority = existingRequest.priority;
      auditDetails.newPriority = body.priority;
    }
    if (body.deadline !== undefined) {
      updateData.deadline = body.deadline ? new Date(body.deadline) : null;
    }
    if (body.categoryId !== undefined) {
      updateData.categoryId = body.categoryId;
    }

    // Domain-specific fields
    const domainFields = ['linkSite', 'donVi', 'linkChucNang', 'hienTrang', 'noiDungDieuChinh', 'quyTrinhThaoTac'];
    for (const field of domainFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    }

    const updatedRequest = await prisma.request.update({
      where: { id: params.id },
      data: updateData,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: body.status ? "status_changed" : "updated",
        details: JSON.stringify(auditDetails),
        userId,
        requestId: params.id,
      },
    });

    // ── Create notifications (with specific messages) ──
    const notifyUserIds: string[] = [];
    const notificationMessages: { userId: string; title: string; message: string; type: string }[] = [];

    // Status change notifications
    if (body.status) {
      if (body.status === "resolved") {
        // Agent marks resolved → notify requester to confirm
        if (existingRequest.requesterId !== userId) {
          notificationMessages.push({
            userId: existingRequest.requesterId,
            title: "Yêu cầu đã xử lý xong",
            message: `Yêu cầu "${existingRequest.title}" đã được xử lý. Vui lòng xác nhận hoàn thành.`,
            type: "status_change",
          });
        }
      } else if (body.status === "closed") {
        // Requester confirms completion → notify agent
        if (existingRequest.assigneeId && existingRequest.assigneeId !== userId) {
          notificationMessages.push({
            userId: existingRequest.assigneeId,
            title: "Yêu cầu đã xác nhận hoàn thành",
            message: `Yêu cầu "${existingRequest.title}" đã được người gửi xác nhận hoàn thành.`,
            type: "status_change",
          });
        }
      } else if (body.status === "in_progress" && role === "requester") {
        // Requester rejects → notify agent
        if (existingRequest.assigneeId && existingRequest.assigneeId !== userId) {
          notificationMessages.push({
            userId: existingRequest.assigneeId,
            title: "Yêu cầu cần xử lý lại",
            message: `Yêu cầu "${existingRequest.title}" chưa được xác nhận. Vui lòng kiểm tra và xử lý lại.`,
            type: "status_change",
          });
        }
      } else {
        // Generic status change
        if (existingRequest.requesterId !== userId) {
          notificationMessages.push({
            userId: existingRequest.requesterId,
            title: "Cập nhật yêu cầu",
            message: `Yêu cầu "${existingRequest.title}" đã chuyển sang trạng thái: ${body.status}`,
            type: "status_change",
          });
        }
        if (existingRequest.assigneeId && existingRequest.assigneeId !== userId) {
          notificationMessages.push({
            userId: existingRequest.assigneeId,
            title: "Cập nhật yêu cầu",
            message: `Yêu cầu "${existingRequest.title}" đã chuyển sang trạng thái: ${body.status}`,
            type: "status_change",
          });
        }
      }
    }

    // Assignment change → notify new assignee
    if (body.assigneeId && body.assigneeId !== existingRequest.assigneeId) {
      notificationMessages.push({
        userId: body.assigneeId,
        title: "Bạn được giao xử lý yêu cầu",
        message: `Yêu cầu "${existingRequest.title}" đã được giao cho bạn xử lý.${body.transferReason ? `\nLý do: ${body.transferReason}` : ""}`,
        type: "assignment",
      });
      // Notify old assignee if exists
      if (existingRequest.assigneeId && existingRequest.assigneeId !== userId) {
        notificationMessages.push({
          userId: existingRequest.assigneeId,
          title: "Yêu cầu đã được chuyển đi",
          message: `Yêu cầu "${existingRequest.title}" đã được chuyển cho người khác xử lý.`,
          type: "assignment",
        });
      }
    }

    for (const n of notificationMessages) {
      await prisma.notification.create({
        data: {
          title: n.title,
          message: n.message,
          type: n.type,
          userId: n.userId,
          link: `/requests/${params.id}`,
        },
      });
    }

    // ── Send Telegram notifications ──
    const config = loadTelegramConfig();
    const requestLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/requests/${params.id}`;

    // Helper: send to user's Telegram
    const sendTelegramNotification = async (userId: string, message: string) => {
      console.log("[Telegram] Looking up user:", userId);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true, name: true },
      });
      console.log("[Telegram] User found:", user);
      if (user?.telegramChatId) {
        console.log("[Telegram] Sending to chatId:", user.telegramChatId);
        const result = await sendTelegramMessage(user.telegramChatId, message);
        console.log("[Telegram] Send result:", result);
      } else {
        console.log("[Telegram] No telegramChatId for user:", userId);
      }
    };

    // Helper: send to group Telegram
    const sendGroupNotification = async (message: string) => {
      if (config.notifyGroupChatId && config.notifyOnStatusChange) {
        await sendTelegramMessage(config.notifyGroupChatId, message);
      }
    };

    // Helper: get user name
    const getUserName = async (userId: string) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      return user?.name || "Không xác định";
    };

    // Rule 1: When assigned → send to new assignee(s) & create RequestAssignment records
    if (body.assigneeIds !== undefined || body.assigneeId !== undefined) {
      const assigneeIds: string[] = body.assigneeIds || (body.assigneeId ? [body.assigneeId] : []);
      
      // Create/update RequestAssignment records
      for (const assigneeId of assigneeIds) {
        await prisma.requestAssignment.upsert({
          where: {
            requestId_userId: {
              requestId: params.id,
              userId: assigneeId,
            },
          },
          update: { status: "active" },
          create: {
            requestId: params.id,
            userId: assigneeId,
            role: "assignee",
            status: "active",
          },
        });
      }
      
      // Send Telegram to all new assignees
      const assignMessage = formatAssignmentMessage({
        title: updatedRequest.title,
        link: requestLink,
        requesterName: updatedRequest.requester?.name,
        priority: updatedRequest.priority,
        deadline: updatedRequest.deadline,
        donVi: updatedRequest.donVi,
        noiDungDieuChinh: updatedRequest.noiDungDieuChinh,
        hienTrang: updatedRequest.hienTrang,
        linkSite: updatedRequest.linkSite,
        linkChucNang: updatedRequest.linkChucNang,
        transferReason: body.transferReason,
      });
      
      // Notify each assignee
      for (const assigneeId of assigneeIds) {
        if (assigneeId !== existingRequest.assigneeId) {
          await sendTelegramNotification(assigneeId, assignMessage);
        }
      }
    }

    // Rule 2: When request is marked resolved → ALWAYS send to requester
    if (body.status === "resolved" && existingRequest.status !== "resolved") {
      console.log("[Rule 2] Sending completion notification to requester:", existingRequest.requesterId);
      const completionMessage = formatCompletionMessage({
        title: updatedRequest.title,
        link: requestLink,
      });
      await sendTelegramNotification(existingRequest.requesterId, completionMessage);
      console.log("[Rule 2] Notification sent to requester!");
    }

    // Rule 3: When status changes → send to group
    if (body.status && body.status !== existingRequest.status) {
      const changedByName = await getUserName(userId);
      const statusMessage = formatStatusChangeMessage({
        title: updatedRequest.title,
        oldStatus: existingRequest.status,
        newStatus: body.status,
        changedBy: changedByName,
        link: requestLink,
      });
      await sendGroupNotification(statusMessage);
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    const existingRequest = await prisma.request.findUnique({
      where: { id: params.id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu" },
        { status: 404 }
      );
    }

    // Admin can delete anything
    // Requester can delete their own requests when status is new or cancelled
    const canDelete =
      role === "admin" ||
      (role !== "requester" && ["new", "cancelled"].includes(existingRequest.status)) ||
      (existingRequest.requesterId === userId && ["new", "cancelled"].includes(existingRequest.status));

    if (!canDelete) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa yêu cầu này" },
        { status: 403 }
      );
    }

    await prisma.request.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
