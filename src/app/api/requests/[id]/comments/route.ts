import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { content, isInternal } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Nội dung bình luận không được để trống" },
        { status: 400 }
      );
    }

    // Only agents/admin can create internal notes
    if (isInternal && role === "requester") {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo ghi chú nội bộ" },
        { status: 403 }
      );
    }

    const request = await prisma.request.findUnique({
      where: { id: params.id },
      select: { id: true, requesterId: true, assigneeId: true, title: true },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu" },
        { status: 404 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        isInternal: isInternal || false,
        userId,
        requestId: params.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "commented",
        details: JSON.stringify({ isInternal: isInternal || false }),
        userId,
        requestId: params.id,
      },
    });

    // Notify relevant users
    const notifyUserIds: string[] = [];
    if (userId !== request.requesterId) {
      notifyUserIds.push(request.requesterId);
    }
    if (request.assigneeId && userId !== request.assigneeId) {
      notifyUserIds.push(request.assigneeId);
    }

    for (const uid of notifyUserIds) {
      await prisma.notification.create({
        data: {
          title: isInternal ? "Ghi chú mới" : "Bình luận mới",
          message: isInternal
            ? `Có ghi chú mới trên yêu cầu "${request.title}"`
            : `Có bình luận mới trên yêu câu "${request.title}"`,
          type: "comment",
          userId: uid,
          link: `/requests/${params.id}`,
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
