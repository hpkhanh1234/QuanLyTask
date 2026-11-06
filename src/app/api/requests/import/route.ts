import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * POST /api/requests/import - Import requests from Excel file
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Không có file" }, { status: 400 });
    }

    // Check file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const allowedExtensions = [".xlsx", ".xls", ".csv"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV" },
        { status: 400 }
      );
    }

    // Read file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: "File không có dữ liệu" },
        { status: 400 }
      );
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // Map Excel columns to request fields
    // Expected columns: tieuDe, donVi, linkSite, linkChucNang, hienTrang, noiDungDieuChinh, quyTrinhThaoTac, mucDoUuTri, hanChot
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; error: string }[],
    };

    // Get priorities for mapping
    const priorities = await prisma.priorityLevel.findMany();

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, any>;
      const rowNum = i + 2; // Excel row (1-indexed + header)

      try {
        // Extract fields from row (handle different column name variations)
        const title =
          row["tieuDe"] || row["Tiêu đề"] || row["tieude"] || row["Title"] || "";
        const donVi = row["donVi"] || row["Đơn vị"] || row["donvi"] || "";
        const linkSite = row["linkSite"] || row["Link/Site"] || row["linksite"] || "";
        const linkChucNang = row["linkChucNang"] || row["Link chức năng"] || row["linkchucnang"] || "";
        const hienTrang = row["hienTrang"] || row["Hiện trạng"] || row["hientrang"] || "";
        const noiDungDieuChinh = row["noiDungDieuChinh"] || row["Nội dung cần điều chỉnh"] || row["noidungdieuchinh"] || "";
        const quyTrinhThaoTac = row["quyTrinhThaoTac"] || row["Quy trình thao tác"] || row["quytrinhthaotac"] || "";
        const mucDoUuTri = row["mucDoUuTri"] || row["Mức độ ưu tiên"] || row["mucdouutri"] || "medium";
        const hanChot = row["hanChot"] || row["Hạn chót"] || row["hanhchot"] || row["Deadline"] || "";

        // Validate required fields
        if (!title || title.trim() === "") {
          throw new Error("Thiếu tiêu đề");
        }

        // Map priority
        const priorityMap: Record<string, string> = {
          "thấp": "low",
          "thap": "low",
          "low": "low",
          "trung bình": "medium",
          "trung binh": "medium",
          "medium": "medium",
          "cao": "high",
          "high": "high",
          "gấp": "urgent",
          "gap": "urgent",
          "urgent": "urgent",
        };

        const priorityKey = priorityMap[mucDoUuTri.toLowerCase().trim()] || "medium";

        // Find matching priority in DB
        const dbPriority = priorities.find(
          (p) => p.key === priorityKey
        );

        // Parse deadline
        let deadline: Date | null = null;
        if (hanChot) {
          if (typeof hanChot === "number") {
            // Excel serial date
            const excelDate = new Date((hanChot - 25569) * 86400 * 1000);
            deadline = excelDate;
          } else {
            const parsed = new Date(hanChot);
            if (!isNaN(parsed.getTime())) {
              deadline = parsed;
            }
          }
        }

        // Create request
        await prisma.request.create({
          data: {
            title: title.trim(),
            description: noiDungDieuChinh?.trim() || "Nhập từ file Excel",
            status: "new",
            priority: dbPriority?.key || "medium",
            deadline,
            requesterId: user.id,
            linkSite: linkSite?.trim() || null,
            donVi: donVi?.trim() || null,
            linkChucNang: linkChucNang?.trim() || null,
            hienTrang: hienTrang?.trim() || null,
            noiDungDieuChinh: noiDungDieuChinh?.trim() || null,
            quyTrinhThaoTac: quyTrinhThaoTac?.trim() || null,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          error: error.message || "Lỗi không xác định",
        });
      }
    }

    // Note: Audit log for import is skipped since it requires requestId

    return NextResponse.json({
      success: true,
      message: `Import thành công ${results.success} yêu cầu${results.failed > 0 ? `, ${results.failed} lỗi` : ""}`,
      results,
    });
  } catch (error) {
    console.error("Error importing requests:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi import" },
      { status: 500 }
    );
  }
}
