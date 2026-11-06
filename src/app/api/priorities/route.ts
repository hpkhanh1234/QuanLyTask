import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const priorities = await prisma.priorityLevel.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // If no priorities exist, seed defaults
    if (priorities.length === 0) {
      const defaults = [
        { key: "low", label: "Thấp", bgColor: "#F3F4F6", textColor: "#374151", sortOrder: 0 },
        { key: "medium", label: "Trung bình", bgColor: "#DBEAFE", textColor: "#1E40AF", sortOrder: 1 },
        { key: "high", label: "Cao", bgColor: "#FFEDD5", textColor: "#9A3412", sortOrder: 2 },
        { key: "urgent", label: "Gấp", bgColor: "#FEE2E2", textColor: "#991B1B", sortOrder: 3 },
      ];
      for (const d of defaults) {
        await prisma.priorityLevel.upsert({
          where: { key: d.key },
          update: {},
          create: d,
        });
      }
      const seeded = await prisma.priorityLevel.findMany({
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json(seeded);
    }

    return NextResponse.json(priorities);
  } catch (error) {
    console.error("Error fetching priorities:", error);
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

    const role = (session.user as any).role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền" }, { status: 403 });
    }

    const { key, label, bgColor, textColor, sortOrder } = await req.json();

    if (!key || !label) {
      return NextResponse.json({ error: "Key và Label là bắt buộc" }, { status: 400 });
    }

    const priority = await prisma.priorityLevel.create({
      data: {
        key: key.toLowerCase().trim(),
        label,
        bgColor: bgColor || "#DBEAFE",
        textColor: textColor || "#1E40AF",
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(priority, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Mức độ ưu tiên với key này đã tồn tại" }, { status: 400 });
    }
    console.error("Error creating priority:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}
