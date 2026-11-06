import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const baseWhere: any = {};
    if (role === "requester") {
      baseWhere.requesterId = userId;
    }

    const createdAtFilter = Object.keys(dateFilter).length
      ? { createdAt: dateFilter }
      : {};

    const where = { ...baseWhere, ...createdAtFilter };

    // Status distribution
    const statusCounts = await prisma.request.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
    });

    // Priority distribution
    const priorityCounts = await prisma.request.groupBy({
      by: ["priority"],
      where,
      _count: { id: true },
    });

    // Category distribution
    const categoryCounts = await prisma.request.groupBy({
      by: ["categoryId"],
      where,
      _count: { id: true },
    });

    // Total requests
    const totalRequests = await prisma.request.count({ where });

    // Resolved count
    const resolvedRequests = await prisma.request.count({
      where: { ...where, status: "resolved" },
    });

    // SLA compliance (resolved before deadline)
    const slaComplied = await prisma.request.count({
      where: {
        ...where,
        status: "resolved",
        resolvedAt: { not: null },
        deadline: { not: null },
      },
    });

    const slaTotal = await prisma.request.count({
      where: {
        ...where,
        deadline: { not: null },
      },
    });

    // Average resolution time (for resolved requests)
    const resolvedWithDates = await prisma.request.findMany({
      where: {
        ...where,
        status: { in: ["resolved", "closed"] },
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    let avgResolutionTime = 0;
    if (resolvedWithDates.length > 0) {
      const totalTime = resolvedWithDates.reduce((acc, r) => {
        return acc + (r.resolvedAt!.getTime() - r.createdAt.getTime());
      }, 0);
      avgResolutionTime = totalTime / resolvedWithDates.length / (1000 * 60 * 60); // hours
    }

    // Overdue requests
    const overdueRequests = await prisma.request.count({
      where: {
        ...where,
        deadline: { lt: new Date() },
        status: { notIn: ["resolved", "closed", "cancelled"] },
      },
    });

    // Requests per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRequests = await prisma.request.groupBy({
      by: ["createdAt"],
      where: {
        ...baseWhere,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    // Agent performance (for admin)
    let agentPerformance: any[] = [];
    if (role === "admin") {
      const agents = await prisma.user.findMany({
        where: { role: "agent", isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              requestsAssigned: true,
            },
          },
        },
      });

      const agentResolvedCounts = await prisma.request.groupBy({
        by: ["assigneeId"],
        where: {
          assigneeId: { in: agents.map((a) => a.id) },
          status: "resolved",
        },
        _count: { id: true },
      });

      const resolvedMap = new Map(
        agentResolvedCounts.map((r) => [r.assigneeId, r._count.id])
      );

      agentPerformance = agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        totalAssigned: agent._count.requestsAssigned,
        resolved: resolvedMap.get(agent.id) || 0,
      }));
    }

    return NextResponse.json({
      totalRequests,
      resolvedRequests,
      slaComplied,
      slaTotal,
      slaRate: slaTotal > 0 ? Math.round((slaComplied / slaTotal) * 100) : 0,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      overdueRequests,
      statusDistribution: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      priorityDistribution: priorityCounts.map((p) => ({
        priority: p.priority,
        count: p._count.id,
      })),
      categoryDistribution: categoryCounts.map((c) => ({
        categoryId: c.categoryId,
        count: c._count.id,
      })),
      agentPerformance,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
