"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  Calendar,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/types";
import { SkeletonStatCards, SkeletonChart } from "@/components/Skeleton";

const STATUS_COLORS = ["#0066B3", "#F59E0B", "#10B981", "#6B7280", "#F97316"];
const PRIORITY_COLORS = ["#10B981", "#F59E0B", "#F97316", "#EF4444"];

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  async function fetchStats() {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateRange.start) params.set("startDate", dateRange.start);
    if (dateRange.end) params.set("endDate", dateRange.end);

    const res = await fetch(`/api/stats?${params}`);
    const data = await res.json();
    setStats(data);
    setLoading(false);
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (dateRange.start) params.set("startDate", dateRange.start);
    if (dateRange.end) params.set("endDate", dateRange.end);
    params.set("format", "csv");
    window.open(`/api/export?${params}`, "_blank");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="animate-pulse h-8 w-56 bg-gray-200 rounded mb-2" />
          <div className="animate-pulse h-4 w-40 bg-gray-200 rounded" />
        </div>
        <SkeletonStatCards count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const statusChartData = (stats?.statusDistribution || []).map(
    (s: any, i: number) => ({
      name: STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] || s.status,
      value: s.count,
      fill: STATUS_COLORS[i % STATUS_COLORS.length],
    })
  );

  const priorityChartData = (stats?.priorityDistribution || []).map(
    (p: any, i: number) => ({
      name:
        PRIORITY_LABELS[p.priority as keyof typeof PRIORITY_LABELS] ||
        p.priority,
      value: p.count,
      fill: PRIORITY_COLORS[i % PRIORITY_COLORS.length],
    })
  );

  const agentData = (stats?.agentPerformance || []).map((a: any) => ({
    name: a.name.split(" ").slice(-1)[0], // Last name only
    fullName: a.name,
    "Đã giao": a.totalAssigned,
    "Đã giải quyết": a.resolved,
  }));

  const slaTotal = stats?.slaTotal || 0;
  const slaComplied = stats?.slaComplied || 0;
  const slaRate = slaTotal > 0 ? Math.round((slaComplied / slaTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Báo cáo & Thống kê
          </h1>
          <p className="text-gray-500 mt-1">
            Phân tích hiệu suất và xu hướng yêu cầu
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="text-sm border-0 focus:outline-none focus:ring-0 w-32"
            />
            <span className="text-gray-300">—</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="text-sm border-0 focus:outline-none focus:ring-0 w-32"
            />
          </div>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#0066B3] to-[#004A8F]">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Tổng cộng</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.totalRequests || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Tổng yêu cầu</p>
        </div>

        {/* SLA Rate */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">
              {slaRate}%
            </span>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{slaRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Tỷ lệ SLA</p>
          <div className="mt-3 progress-bar">
            <div
              className="progress-fill bg-gradient-to-r from-emerald-400 to-emerald-600"
              style={{ width: `${slaRate}%` }}
            />
          </div>
        </div>

        {/* Avg Resolution Time */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#00A3E0] to-[#0066B3]">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-[#0066B3] font-medium">
              Trung bình
            </span>
          </div>
          <p className="text-3xl font-bold text-[#0066B3]">
            {stats?.avgResolutionTime || 0}
            <span className="text-lg font-medium">h</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">Thời gian xử lý</p>
        </div>

        {/* Overdue */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            {(stats?.overdueRequests || 0) > 0 && (
              <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-full animate-pulse">
                ⚠️ Cần xử lý
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-red-600">
            {stats?.overdueRequests || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Yêu cầu quá hạn</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - Pie Chart */}
        <div className="section-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#0066B3]/10">
              <BarChart3 className="w-5 h-5 text-[#0066B3]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Phân bổ theo trạng thái
              </h3>
              <p className="text-sm text-gray-500">Tỷ lệ yêu cầu theo trạng thái</p>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution - Bar Chart */}
        <div className="section-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Phân bổ theo ưu tiên
              </h3>
              <p className="text-sm text-gray-500">Số lượng theo mức ưu tiên</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={priorityChartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {priorityChartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance */}
      {agentData.length > 0 && (
        <div className="section-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Hiệu suất nhân sự
              </h3>
              <p className="text-sm text-gray-500">
                So sánh số lượng yêu cầu đã giao và đã giải quyết
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={agentData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
                formatter={(value: any, name: any, props: any) => [
                  value,
                  name,
                  props.payload.fullName,
                ]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: "20px" }}
              />
              <Bar
                dataKey="Đã giao"
                fill="#0066B3"
                radius={[8, 8, 0, 0]}
                barSize={32}
              />
              <Bar
                dataKey="Đã giải quyết"
                fill="#10B981"
                radius={[8, 8, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* SLA Summary */}
      <div className="section-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tổng quan SLA</h3>
            <p className="text-sm text-gray-500">
              Thống kê tỷ lệ hoàn thành đúng hạn
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <p className="text-4xl font-bold text-emerald-600">
              {stats?.slaComplied || 0}
            </p>
            <p className="text-sm text-emerald-700 font-medium mt-2">
              ✅ Đúng hạn
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-4xl font-bold text-red-600">
              {slaTotal - slaComplied}
            </p>
            <p className="text-sm text-red-700 font-medium mt-2">
              ⚠️ Trễ hạn
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-4xl font-bold text-gray-600">{slaTotal}</p>
            <p className="text-sm text-gray-700 font-medium mt-2">
              📊 Có hạn chót
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
