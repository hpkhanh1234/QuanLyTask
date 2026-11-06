"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  X,
  ArrowRight,
  Calendar,
  Users,
  BarChart3,
  PlusCircle,
  Zap,
  Activity,
  Target,
  Award,
  Timer,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_COLORS, STATUS_BG_COLORS, PRIORITY_BG_COLORS } from "@/lib/types";
import { SkeletonStatCards, SkeletonChart } from "@/components/Skeleton";

const COLORS = ["#0066B3", "#00A3E0", "#00A651", "#F7941D", "#6b7280", "#E31E24"];
const PRIORITY_COLORS_MAP: Record<string, string> = {
  low: "#6b7280",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loadingFiltered, setLoadingFiltered] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/requests?limit=8").then((r) => r.json()),
    ]).then(([statsData, requestsData]) => {
      setStats(statsData);
      setRecentRequests(requestsData.requests || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="animate-pulse h-8 w-64 bg-gray-200 rounded mb-2" />
          <div className="animate-pulse h-4 w-48 bg-gray-200 rounded" />
        </div>
        <SkeletonStatCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  async function handleStatClick(filter: string) {
    setSelectedFilter(filter);
    setLoadingFiltered(true);
    let url = "/api/requests?limit=50";
    if (filter === "in_progress") url += "&status=in_progress";
    else if (filter === "new") url += "&status=new";
    else if (filter === "resolved") url += "&status=resolved";
    else if (filter === "overdue") url += "&overdue=true";
    const res = await fetch(url);
    const data = await res.json();
    setFilteredRequests(data.requests || []);
    setLoadingFiltered(false);
  }

  const statCards = [
    {
      title: "Tổng yêu cầu",
      value: stats?.totalRequests || 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-gradient-to-br from-blue-500 to-blue-600",
      lightBg: "bg-blue-50",
      filter: "all",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Đang xử lý",
      value: stats?.statusDistribution?.find((s: any) => s.status === "in_progress")?.count || 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-gradient-to-br from-amber-400 to-amber-500",
      lightBg: "bg-amber-50",
      filter: "in_progress",
      trend: "+5%",
      trendUp: true,
    },
    {
      title: "Đã giải quyết",
      value: stats?.resolvedRequests || 0,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-gradient-to-br from-emerald-400 to-emerald-500",
      lightBg: "bg-emerald-50",
      filter: "resolved",
      trend: "+18%",
      trendUp: true,
    },
    {
      title: "Quá hạn",
      value: stats?.overdueRequests || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-gradient-to-br from-red-400 to-red-500",
      lightBg: "bg-red-50",
      filter: "overdue",
      trend: "-3%",
      trendUp: false,
    },
    {
      title: "Tỷ lệ SLA",
      value: `${stats?.slaRate || 0}%`,
      icon: Target,
      color: "text-purple-600",
      bg: "bg-gradient-to-br from-purple-400 to-purple-500",
      lightBg: "bg-purple-50",
      filter: null,
      trend: "+2%",
      trendUp: true,
    },
    {
      title: "Thời gian XLTB",
      value: `${stats?.avgResolutionTime || 0}h`,
      icon: Timer,
      color: "text-indigo-600",
      bg: "bg-gradient-to-br from-indigo-400 to-indigo-500",
      lightBg: "bg-indigo-50",
      filter: null,
      trend: "-8%",
      trendUp: true,
    },
  ];

  const statusData = (stats?.statusDistribution || []).map((s: any) => ({
    name: STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] || s.status,
    value: s.count,
  }));

  const priorityData = (stats?.priorityDistribution || []).map((p: any) => ({
    name: PRIORITY_LABELS[p.priority as keyof typeof PRIORITY_LABELS] || p.priority,
    value: p.count,
    color: PRIORITY_COLORS_MAP[p.priority] || "#6b7280",
  }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  const getRoleName = () => {
    const role = (session?.user as any)?.role;
    if (role === "admin") return "Quản trị viên";
    if (role === "agent") return "Người xử lý";
    return "Người gửi";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#003B6F] via-[#0066B3] to-[#00A3E0] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white rounded-full -translate-y-1/2" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {getGreeting()}, {session?.user?.name || "Bạn"}! 👋
                </h1>
                <p className="text-blue-100 text-sm mt-1">
                  {getRoleName()} • Hôm nay bạn có {stats?.totalRequests || 0} yêu cầu trong hệ thống
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Link
              href="/requests/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#0066B3] rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg"
            >
              <PlusCircle className="w-5 h-5" />
              Tạo yêu cầu mới
            </Link>
            <Link
              href="/reports"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              <BarChart3 className="w-5 h-5" />
              Báo cáo
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className={`bg-white rounded-2xl border border-gray-100 p-4 transition-all duration-300 group ${
              card.filter
                ? "cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-transparent"
                : ""
            }`}
            onClick={() => card.filter && handleStatClick(card.filter)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-3 rounded-xl ${card.bg} shadow-lg group-hover:scale-110 transition-transform`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                card.trendUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {card.trend}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-[#0066B3]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Phân bổ theo trạng thái
                </h3>
                <p className="text-xs text-gray-500">Tỷ lệ yêu cầu theo từng trạng thái</p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {statusData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Legend
                iconType="circle"
                iconSize={10}
                formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Phân bổ theo ưu tiên
                </h3>
                <p className="text-xs text-gray-500">Phân loại yêu cầu theo mức độ ưu tiên</p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={priorityData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {priorityData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Requests & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests - 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-[#0066B3]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Yêu cầu gần đây
                </h3>
                <p className="text-xs text-gray-500">8 yêu cầu mới nhất</p>
              </div>
            </div>
            <Link
              href="/requests"
              className="flex items-center gap-1 px-4 py-2 text-[#0066B3] hover:bg-blue-50 rounded-xl text-sm font-medium transition-colors"
            >
              Xem tất cả
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto px-6 pb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left font-medium text-gray-500">Tiêu đề</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Trạng thái</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Ưu tiên</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Người xử lý</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5">
                      <Link
                        href={`/requests/${req.id}`}
                        className="text-[#0066B3] hover:text-[#003B6F] font-medium hover:underline"
                      >
                        {req.title}
                      </Link>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`badge ${STATUS_COLORS[req.status as keyof typeof STATUS_COLORS]}`}
                      >
                        {STATUS_LABELS[req.status as keyof typeof STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-gray-600">
                        {PRIORITY_LABELS[req.priority as keyof typeof PRIORITY_LABELS]}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                          {req.assignee?.name?.charAt(0) || "?"}
                        </div>
                        <span className="text-gray-600">{req.assignee?.name || "Chưa giao"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                ))}
                {recentRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Chưa có yêu cầu nào</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          {/* SLA Performance */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hiệu suất SLA</h3>
                <p className="text-xs text-gray-500">Tỷ lệ hoàn thành đúng hạn</p>
              </div>
            </div>
            <div className="relative pt-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-gray-900">{stats?.slaRate || 0}%</span>
                <span className="text-xs text-emerald-600 font-medium">+2% so với tháng trước</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats?.slaRate || 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0%</span>
                <span>Mục tiêu: 95%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Overdue Alert */}
          {(stats?.overdueRequests || 0) > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Cảnh báo quá hạn</h3>
                  <p className="text-xs text-red-600">Yêu cầu cần xử lý gấp</p>
                </div>
              </div>
              <div className="text-center py-4">
                <span className="text-5xl font-bold text-red-600">{stats?.overdueRequests || 0}</span>
                <p className="text-sm text-red-600 mt-2">yêu cầu đã quá hạn</p>
              </div>
              <button
                onClick={() => handleStatClick("overdue")}
                className="w-full mt-3 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Xem ngay
              </button>
            </div>
          )}

          {/* Average Resolution Time */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Timer className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-800">Thời gian xử lý TB</h3>
                <p className="text-xs text-indigo-600">Trung bình từ tạo đến hoàn thành</p>
              </div>
            </div>
            <div className="text-center py-4">
              <span className="text-4xl font-bold text-indigo-600">{stats?.avgResolutionTime || 0}</span>
              <span className="text-lg text-indigo-400 ml-1">giờ</span>
              <p className="text-sm text-indigo-600 mt-2">
                {stats?.avgResolutionTime <= 24 ? "🎉 Rất tốt!" : 
                 stats?.avgResolutionTime <= 72 ? "👍 Khá tốt" : "⚠️ Cần cải thiện"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Modal Chi tiết khi nhấn vào Stat Card ═══ */}
      {selectedFilter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedFilter(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedFilter === "all" && "📋 Tất cả yêu cầu"}
                  {selectedFilter === "in_progress" && "🔄 Yêu cầu đang xử lý"}
                  {selectedFilter === "resolved" && "✅ Yêu cầu đã giải quyết"}
                  {selectedFilter === "overdue" && "⚠️ Yêu cầu quá hạn"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredRequests.length} yêu cầu
                </p>
              </div>
              <button
                onClick={() => setSelectedFilter(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {loadingFiltered ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0066B3]"></div>
                  <p className="text-sm text-gray-500 mt-4">Đang tải dữ liệu...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Không có yêu cầu nào</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-left font-medium text-gray-500 w-12">STT</th>
                      <th className="pb-3 text-left font-medium text-gray-500">Tiêu đề</th>
                      <th className="pb-3 text-left font-medium text-gray-500">Đơn vị</th>
                      <th className="pb-3 text-left font-medium text-gray-500">Trạng thái</th>
                      <th className="pb-3 text-left font-medium text-gray-500">Ưu tiên</th>
                      <th className="pb-3 text-left font-medium text-gray-500">Người xử lý</th>
                      <th className="pb-3 text-left font-medium text-gray-500">Hạn chót</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRequests
                      .sort((a, b) => {
                        const order: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
                        return (order[b.priority] || 0) - (order[a.priority] || 0);
                      })
                      .map((req: any, index: number) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 text-center text-gray-500 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3.5">
                          <Link
                            href={`/requests/${req.id}`}
                            onClick={() => setSelectedFilter(null)}
                            className="text-[#0066B3] hover:text-[#003B6F] font-medium hover:underline"
                          >
                            {req.title}
                          </Link>
                        </td>
                        <td className="py-3.5 text-gray-600">{req.donVi || "—"}</td>
                        <td className="py-3.5">
                          <span className="badge" style={STATUS_BG_COLORS[req.status as keyof typeof STATUS_BG_COLORS] || {}}>
                            {STATUS_LABELS[req.status as keyof typeof STATUS_LABELS]}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className="badge" style={PRIORITY_BG_COLORS[req.priority as keyof typeof PRIORITY_BG_COLORS] || {}}>
                            {PRIORITY_LABELS[req.priority as keyof typeof PRIORITY_LABELS]}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                              {req.assignee?.name?.charAt(0) || "?"}
                            </div>
                            <span className="text-gray-600">{req.assignee?.name || "Chưa giao"}</span>
                          </div>
                        </td>
                        <td className="py-3.5">
                          {req.deadline ? (
                            <span className={`text-sm ${new Date(req.deadline) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                              {new Date(req.deadline).toLocaleDateString("vi-VN")}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <Link
                href="/requests"
                onClick={() => setSelectedFilter(null)}
                className="flex items-center gap-2 px-6 py-3 bg-[#0066B3] text-white rounded-xl hover:bg-[#003B6F] transition-colors text-sm font-semibold shadow-lg shadow-blue-500/25"
              >
                Xem tất cả trong trang Yêu cầu
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
