import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    if (role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, role: newRole, department, isActive, password, telegramChatId } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    // Prevent removing last admin
    if (existingUser.role === "admin" && newRole && newRole !== "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin", isActive: true },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Không thể thay đổi vai trò của quản trị viên cuối cùng" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (newRole !== undefined) updateData.role = newRole;
    if (department !== undefined) updateData.department = department || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId || null;
    if (password) {
      // Hash password
      const bcrypt = await import("bcryptjs");
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        telegramChatId: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Email đã tồn tại" },
        { status: 400 }
      );
    }
    console.error("Error updating user:", error);
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
    if (role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền" },
        { status: 403 }
      );
    }

    // Can't delete yourself
    if (params.id === userId) {
      return NextResponse.json(
        { error: "Không thể xóa chính mình" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    // Prevent deleting last admin
    if (existingUser.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin", isActive: true },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Không thể xóa quản trị viên cuối cùng" },
          { status: 400 }
        );
      }
    }

    // Soft delete - deactivate instead of hard delete
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false, email: `deleted_${Date.now()}_${existingUser.email}` },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
