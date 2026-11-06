import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const categoryId = searchParams.get("categoryId");

    const where: any = {};
    if (role === "requester") {
      where.requesterId = userId;
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;

    const requests = await prisma.request.findMany({
      where,
      include: {
        requester: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = requests.map((r) => ({
      "Mã yêu cầu": r.id.slice(0, 8),
      "Tiêu đề": r.title,
      "Trạng thái": STATUS_LABELS[r.status as keyof typeof STATUS_LABELS],
      "Ưu tiên": PRIORITY_LABELS[r.priority as keyof typeof PRIORITY_LABELS],
      "Danh mục": r.category?.name || "N/A",
      "Người gửi": r.requester.name || r.requester.email,
      "Người xử lý": r.assignee?.name || r.assignee?.email || "Chưa giao",
      "Ngày tạo": new Date(r.createdAt).toLocaleDateString("vi-VN"),
      "Hạn chót": r.deadline
        ? new Date(r.deadline).toLocaleDateString("vi-VN")
        : "N/A",
      "Ngày giải quyết": r.resolvedAt
        ? new Date(r.resolvedAt).toLocaleDateString("vi-VN")
        : "N/A",
    }));

    if (format === "excel") {
      // Return as JSON for client-side Excel generation
      return NextResponse.json({ data, format: "excel" });
    }

    // CSV format
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = (row as any)[h] || "";
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="requests-export.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
