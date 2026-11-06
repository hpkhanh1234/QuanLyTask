import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/types";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const categoryId = searchParams.get("categoryId");
    const view = searchParams.get("view") || "all";

    const where: any = {};
    
    // View-based filtering
    if (role === "requester") {
      if (view === "all") {
        where.OR = [{ requesterId: userId }, { assigneeId: userId }];
      } else if (view === "new_created") {
        where.requesterId = userId;
        where.status = "new";
        where.assigneeId = null;
      } else if (view === "transferred") {
        where.requesterId = userId;
        where.assigneeId = { not: null };
      } else if (view === "assigned") {
        where.assigneeId = userId;
      } else if (view === "completed") {
        where.OR = [{ requesterId: userId }, { assigneeId: userId }];
        where.status = { in: ["resolved", "closed"] };
      } else if (view === "returned") {
        where.assigneeId = userId;
        where.status = "cancelled";
      }
    } else if (role === "agent") {
      if (view === "all") {
        where.OR = [{ requesterId: userId }, { assigneeId: userId }];
      } else if (view === "assigned") {
        where.assigneeId = userId;
      } else if (view === "completed") {
        where.OR = [{ requesterId: userId }, { assigneeId: userId }];
        where.status = { in: ["resolved", "closed"] };
      }
    }
    // Admin sees all

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;

    // Fetch all data in parallel
    const [requests, allUsers, allCategories] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          requester: { select: { name: true, email: true, department: true } },
          assignee: { select: { name: true, email: true, department: true } },
          category: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, department: true },
      }),
      prisma.category.findMany({
        select: { id: true, name: true, color: true },
      }),
    ]);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "QL Yêu cầu System";
    workbook.created = new Date();

    // ══════════════════════════════════════════════
    // SHEET 1: DANH SÁCH YÊU CẦU
    // ══════════════════════════════════════════════
    const ws1 = workbook.addWorksheet("Danh sách yêu cầu", {
      properties: { defaultColWidth: 18 },
    });

    // Title row
    ws1.mergeCells("A1:L1");
    const titleCell = ws1.getCell("A1");
    titleCell.value = "DANH SÁCH YÊU CẦU";
    titleCell.font = { size: 16, bold: true, color: { argb: "FF003B6F" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws1.getRow(1).height = 35;

    // Subtitle
    ws1.mergeCells("A2:L2");
    const subtitleCell = ws1.getCell("A2");
    subtitleCell.value = `Xuất ngày: ${new Date().toLocaleDateString("vi-VN")} | Tổng: ${requests.length} yêu cầu`;
    subtitleCell.font = { size: 10, italic: true, color: { argb: "FF666666" } };
    subtitleCell.alignment = { horizontal: "center" };
    ws1.getRow(2).height = 22;

    // Headers
    const headers1 = [
      "STT", "Mã yêu cầu", "Tiêu đề", "Link/Site", "Đơn vị", 
      "Nội dung điều chỉnh", "Trạng thái", "Ưu tiên", "Danh mục",
      "Người gửi", "Người xử lý", "Hạn chót"
    ];
    
    const headerRow1 = ws1.addRow(headers1);
    headerRow1.height = 28;
    headerRow1.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0066B3" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF003B6F" } },
        bottom: { style: "thin", color: { argb: "FF003B6F" } },
        left: { style: "thin", color: { argb: "FF003B6F" } },
        right: { style: "thin", color: { argb: "FF003B6F" } },
      };
    });

    // Data rows
    requests.forEach((r, i) => {
      const row = ws1.addRow([
        i + 1,
        r.id.slice(0, 8),
        r.title,
        r.linkSite || "",
        r.donVi || "",
        r.noiDungDieuChinh || "",
        STATUS_LABELS[r.status as keyof typeof STATUS_LABELS],
        PRIORITY_LABELS[r.priority as keyof typeof PRIORITY_LABELS],
        r.category?.name || "",
        r.requester.name || r.requester.email,
        r.assignee?.name || r.assignee?.email || "Chưa giao",
        r.deadline ? new Date(r.deadline).toLocaleDateString("vi-VN") : "",
      ]);

      // Alternate row colors
      const bgColor = i % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF";
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        cell.alignment = { vertical: "middle", wrapText: true };

        // Color code status
        if (colNumber === 7) {
          const statusColors: Record<string, string> = {
            "Mới tạo": "FF3B82F6",
            "Đang xử lý": "FF0066B3",
            "Chờ phản hồi": "FFF7941D",
            "Đã giải quyết": "FF00A651",
            "Đã đóng": "FF6B7280",
            "Đã hủy": "FFE31E24",
          };
          const color = statusColors[cell.value as string];
          if (color) {
            cell.font = { bold: true, color: { argb: color } };
          }
        }

        // Color code priority
        if (colNumber === 8) {
          const priorityColors: Record<string, string> = {
            "Thấp": "FF00A651",
            "Trung bình": "FF3B82F6",
            "Cao": "FFF7941D",
            "Gấp": "FFE31E24",
          };
          const color = priorityColors[cell.value as string];
          if (color) {
            cell.font = { bold: true, color: { argb: color } };
          }
        }
      });
    });

    // Auto column width
    ws1.columns.forEach((col) => {
      if (col) {
        col.width = Math.max(12, Math.min(35, col.width || 15));
      }
    });

    // Freeze header row
    ws1.views = [{ state: "frozen", ySplit: 3 }];

    // ══════════════════════════════════════════════
    // SHEET 2: THỐNG KÊ THEO TRẠNG THÁI
    // ══════════════════════════════════════════════
    const ws2 = workbook.addWorksheet("Thống kê trạng thái", {
      properties: { defaultColWidth: 15 },
    });

    // Title
    ws2.mergeCells("A1:E1");
    ws2.getCell("A1").value = "THỐNG KÊ YÊU CẦU THEO TRẠNG THÁI";
    ws2.getCell("A1").font = { size: 14, bold: true, color: { argb: "FF003B6F" } };
    ws2.getCell("A1").alignment = { horizontal: "center" };
    ws2.getRow(1).height = 30;

    // Count by status
    const statusCounts: Record<string, number> = {};
    requests.forEach((r) => {
      const label = STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] || r.status;
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });

    // Headers
    const statusHeaderRow = ws2.addRow(["Trạng thái", "Số lượng", "Tỷ lệ (%)"]);
    statusHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0066B3" } };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF003B6F" } },
      };
    });

    // Data
    const total = requests.length || 1;
    Object.entries(statusCounts).forEach(([status, count], i) => {
      const row = ws2.addRow([status, count, ((count / total) * 100).toFixed(1)]);
      const bgColor = i % 2 === 0 ? "FFF0F9FF" : "FFFFFFFF";
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.alignment = { horizontal: "center" };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
      });
    });

    // Total row
    const totalRow = ws2.addRow(["TỔNG CỘNG", requests.length, "100%"]);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F4FD" } };
      cell.alignment = { horizontal: "center" };
      cell.border = { top: { style: "medium", color: { argb: "FF0066B3" } } };
    });

    // ══════════════════════════════════════════════
    // SHEET 3: THỐNG KÊ THEO DANH MỤC
    // ══════════════════════════════════════════════
    const ws3 = workbook.addWorksheet("Thống kê danh mục", {
      properties: { defaultColWidth: 15 },
    });

    // Title
    ws3.mergeCells("A1:D1");
    ws3.getCell("A1").value = "THỐNG KÊ YÊU CẦU THEO DANH MỤC";
    ws3.getCell("A1").font = { size: 14, bold: true, color: { argb: "FF003B6F" } };
    ws3.getCell("A1").alignment = { horizontal: "center" };

    // Count by category
    const categoryCounts: Record<string, number> = {};
    requests.forEach((r) => {
      const name = r.category?.name || "Chưa phân loại";
      categoryCounts[name] = (categoryCounts[name] || 0) + 1;
    });

    // Headers
    const catHeaderRow = ws3.addRow(["Danh mục", "Số lượng", "Tỷ lệ (%)"]);
    catHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00A651" } };
      cell.alignment = { horizontal: "center" };
    });

    // Data
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count], i) => {
        const row = ws3.addRow([cat, count, ((count / total) * 100).toFixed(1)]);
        const bgColor = i % 2 === 0 ? "FFF0FDF4" : "FFFFFFFF";
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.alignment = { horizontal: "center" };
        });
      });

    // Total
    ws3.addRow(["TỔNG CỘNG", requests.length, "100%"]).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F4FD" } };
      cell.alignment = { horizontal: "center" };
    });

    // ══════════════════════════════════════════════
    // SHEET 4: HIỆU SUẤT NHÂN VIÊN
    // ══════════════════════════════════════════════
    const ws4 = workbook.addWorksheet("Hiệu suất nhân viên", {
      properties: { defaultColWidth: 18 },
    });

    // Title
    ws4.mergeCells("A1:G1");
    ws4.getCell("A1").value = "BÁO CÁO HIỆU SUẤT XỬ LÝ YÊU CẦU";
    ws4.getCell("A1").font = { size: 14, bold: true, color: { argb: "FF003B6F" } };
    ws4.getCell("A1").alignment = { horizontal: "center" };

    // Calculate agent performance
    const agentStats: Record<string, {
      name: string;
      email: string;
      total: number;
      completed: number;
      inProgress: number;
      avgDays: number;
    }> = {};

    requests.forEach((r) => {
      if (!r.assignee) return;
      const key = r.assignee.email;
      if (!agentStats[key]) {
        agentStats[key] = {
          name: r.assignee.name || r.assignee.email,
          email: r.assignee.email,
          total: 0,
          completed: 0,
          inProgress: 0,
          avgDays: 0,
        };
      }
      agentStats[key].total++;
      if (["resolved", "closed"].includes(r.status)) {
        agentStats[key].completed++;
        if (r.resolvedAt) {
          const days = Math.ceil(
            (new Date(r.resolvedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          agentStats[key].avgDays += days;
        }
      } else if (["new", "in_progress", "waiting_response"].includes(r.status)) {
        agentStats[key].inProgress++;
      }
    });

    // Headers
    const agentHeaderRow = ws4.addRow([
      "Nhân viên", "Tổng yêu cầu", "Đã hoàn thành", 
      "Đang xử lý", "Tỷ lệ hoàn thành", "Thời gian TB (ngày)"
    ]);
    agentHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7941D" } };
      cell.alignment = { horizontal: "center", wrapText: true };
    });

    // Data
    Object.values(agentStats)
      .sort((a, b) => b.completed - a.completed)
      .forEach((agent, i) => {
        const completionRate = agent.total > 0 
          ? ((agent.completed / agent.total) * 100).toFixed(1) 
          : "0";
        const avgDays = agent.completed > 0 
          ? (agent.avgDays / agent.completed).toFixed(1) 
          : "N/A";

        const row = ws4.addRow([
          agent.name,
          agent.total,
          agent.completed,
          agent.inProgress,
          `${completionRate}%`,
          avgDays,
        ]);

        const bgColor = i % 2 === 0 ? "FFFFFBF5" : "FFFFFFFF";
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.alignment = { horizontal: "center" };
        });
      });

    // ══════════════════════════════════════════════
    // SHEET 5: YÊU CẦU QUÁ HẠN
    // ══════════════════════════════════════════════
    const overdueRequests = requests.filter(
      (r) =>
        r.deadline &&
        new Date(r.deadline) < new Date() &&
        !["resolved", "closed", "cancelled"].includes(r.status)
    );

    if (overdueRequests.length > 0) {
      const ws5 = workbook.addWorksheet("Yêu cầu quá hạn", {
        properties: { defaultColWidth: 15 },
      });

      ws5.mergeCells("A1:F1");
      ws5.getCell("A1").value = `YÊU CẦU QUÁ HẠN (${overdueRequests.length})`;
      ws5.getCell("A1").font = { size: 14, bold: true, color: { argb: "FFE31E24" } };
      ws5.getCell("A1").alignment = { horizontal: "center" };

      const overdueHeaders = ws5.addRow([
        "Tiêu đề", "Đơn vị", "Người xử lý", "Hạn chót", "Số ngày quá hạn"
      ]);
      overdueHeaders.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE31E24" } };
        cell.alignment = { horizontal: "center" };
      });

      overdueRequests.forEach((r) => {
        const daysOverdue = Math.ceil(
          (new Date().getTime() - new Date(r.deadline!).getTime()) / (1000 * 60 * 60 * 24)
        );
        const row = ws5.addRow([
          r.title,
          r.donVi || "",
          r.assignee?.name || "Chưa giao",
          new Date(r.deadline!).toLocaleDateString("vi-VN"),
          daysOverdue,
        ]);
        row.eachCell((cell, colNumber) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
          if (colNumber === 5) {
            cell.font = { bold: true, color: { argb: "FFE31E24" } };
          }
        });
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="BaoCaoYeuCau_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting Excel:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi xuất file Excel" },
      { status: 500 }
    );
  }
}
