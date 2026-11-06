import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_EXTENSIONS = [".bat", ".cmd"];

/**
 * POST /api/admin/bat-schedule/upload
 * Tải file .bat lên máy chủ để chạy theo lịch.
 * File được lưu tại data/scripts/ và chạy với thư mục làm việc là data/scripts/.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((session.user as any).role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không có file" }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file .bat hoặc .cmd" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File không được vượt quá 1MB" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "data", "scripts");
    await fs.mkdir(uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
    const filePath = path.join(uploadDir, safeName);

    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      path: filePath,
      filename: file.name,
      message: `Đã tải lên ${file.name}`,
    });
  } catch (error) {
    console.error("Error uploading bat file:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tải file" },
      { status: 500 }
    );
  }
}
