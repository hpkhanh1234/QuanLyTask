import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const requestId = formData.get("requestId") as string;

    if (!file) {
      return NextResponse.json({ error: "Không có file" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File không được vượt quá 10MB" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain", "application/zip",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Định dạng file không được hỗ trợ" }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split(".").pop();
    const filename = `${uuidv4()}.${ext}`;
    const filepath = join(uploadDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Save to database if requestId provided
    if (requestId) {
      const attachment = await prisma.attachment.create({
        data: {
          filename: file.name,
          url: `/uploads/${filename}`,
          size: file.size,
          mimeType: file.type,
          requestId,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: "file_uploaded",
          details: JSON.stringify({ filename: file.name, size: file.size }),
          userId: (session.user as any).id,
          requestId,
        },
      });

      return NextResponse.json(attachment);
    }

    // Return file info without saving to DB (for preview)
    return NextResponse.json({
      filename: file.name,
      url: `/uploads/${filename}`,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Lỗi upload file" }, { status: 500 });
  }
}
