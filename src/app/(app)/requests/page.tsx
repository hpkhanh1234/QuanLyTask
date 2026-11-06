"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Plus, Filter, Search, Download, ChevronLeft, ChevronRight,
  FileText, Send, ClipboardCheck, CheckCircle2, RotateCcw, User,
  MoreVertical, UserPlus, Trash2, Pencil,
} from "lucide-react"
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  STATUS_BG_COLORS, PRIORITY_BG_COLORS,
} from "@/lib/types";
import { SkeletonTable, SkeletonTabs } from "@/components/Skeleton";
import ExcelImport from "@/components/ExcelImport";

type TabKey = "all" | "new_created" | "transferred" | "assigned" | "completed" | "returned";

const TABS: { key: TabKey; label: string; icon: any; description: string }[] = [
  { key: "all",          label: "Tất cả",              icon: FileText,          description: "Mọi yêu cầu liên quan" },
  { key: "new_created",  label: "Mới khởi tạo",        icon: Send,              description: "Chưa chuyển xử lý" },
  { key: "transferred",  label: "Đã chuyển xử lý",     icon: ClipboardCheck,    description: "Đã gán người xử lý" },
  { key: "assigned",     label: "Được giao xử lý",     icon: User,              description: "Gán cho tôi xử lý" },
  { key: "completed",    label: "Đã hoàn thành",       icon: CheckCircle2,      description: "Đã giải quyết" },
  { key: "returned",     label: "Bị trả lại",           icon: RotateCcw,         description: "Chờ cập nhật nội dung" },
];

export default function RequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [perPage, setPerPage] = useState(15);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [displayTab, setDisplayTab] = useState<TabKey>("all");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tabCounts, setTabCounts] = useState<Record<TabKey, number>>({
    all: 0, new_created: 0, transferred: 0, assigned: 0, completed: 0, returned: 0,
  });

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    categoryId: "",
    assigneeId: "",
    search: "",
    page: 1,
  });

  useEffect(() => {
    fetchCategories();
    fetchUsers();
    fetchTabCounts();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filters, activeTab, perPage]);

  // Sort requests by priority: urgent > high > medium > low
  const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  const sortedRequests = [...requests].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] || 0;
    const pb = PRIORITY_ORDER[b.priority] || 0;
    return pb - pa; // Highest priority first
  });

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }

  async function fetchUsers() {
    const res = await fetch("/api/users");
    setUsers(await res.json());
  }

  async function fetchTabCounts() {
    const tabs: TabKey[] = ["all", "new_created", "transferred", "assigned", "completed", "returned"];
    const results = await Promise.all(
      tabs.map((t) =>
        fetch(`/api/requests?view=${t}&limit=1`).then((r) => r.json())
      )
    );
    const counts: Record<TabKey, number> = {
      all: 0, new_created: 0, transferred: 0, assigned: 0, completed: 0, returned: 0,
    };
    tabs.forEach((t, i) => {
      counts[t] = results[i].pagination?.total || 0;
    });
    setTabCounts(counts);
  }

  async function fetchRequests() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("view", activeTab);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(filters.page));
    params.set("limit", String(perPage));

    const res = await fetch(`/api/requests?${params}`);
    const data = await res.json();
    setRequests(data.requests || []);
    setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
    setLoading(false);
  }

  function handleExport(format: "csv" | "excel") {
    const params = new URLSearchParams();
    params.set("view", activeTab);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (format === "excel") {
      window.open(`/api/export/excel?${params}`, "_blank");
    } else {
      window.open(`/api/export?${params}&format=csv`, "_blank");
    }
  }

  const [showExportMenu, setShowExportMenu] = useState(false);

  function handleTabChange(tab: TabKey) {
    if (tab === activeTab) return;
    // Start fade out
    setIsTransitioning(true);
    // After fade out, switch tab and fade in
    setTimeout(() => {
      setActiveTab(tab);
      setDisplayTab(tab);
      setFilters((f) => ({ ...f, page: 1 }));
      // Start fade in after a tick
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    }, 200);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vnpt-darkblue">Yêu cầu</h1>
          <p className="text-gray-600 mt-1">Quản lý và theo dõi yêu cầu</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Import from Excel */}
          <ExcelImport onSuccess={() => {
            fetchRequests();
            fetchTabCounts();
          }} />

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Xuất dữ liệu
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20">
                  <button
                    onClick={() => { handleExport("csv"); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">Xuất CSV</p>
                      <p className="text-xs text-gray-500">File đơn giản, mở bằng Notepad</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { handleExport("excel"); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">X</span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Xuất Excel</p>
                      <p className="text-xs text-gray-500">Nhiều sheets, biểu đồ, định dạng</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <Link href="/requests/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tạo yêu cầu mới
          </Link>
        </div>
      </div>

      {/* Tabs - VNPT style */}
      <div className="flex gap-1 bg-vnpt-lightblue p-1.5 rounded-xl overflow-x-auto relative">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-white text-vnpt-blue shadow-md border border-primary-200 scale-[1.02]"
                  : "text-vnpt-darkblue/70 hover:text-vnpt-blue hover:bg-white/60 hover:scale-[1.01]"
              }`}
              title={tab.description}
            >
              <tab.icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
              {tab.label}
              <span
                className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-vnpt-blue text-white scale-110"
                    : "bg-vnpt-darkblue/10 text-vnpt-darkblue/60"
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, đơn vị, nội dung điều chỉnh..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? "bg-vnpt-lightblue text-vnpt-blue" : ""}`}
          >
            <Filter className="w-4 h-4" />
            Lọc
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <label className="label">Trạng thái</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="input-field"
              >
                <option value="">Tất cả</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mức độ ưu tiên</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
                className="input-field"
              >
                <option value="">Tất cả</option>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Danh mục</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}
                className="input-field"
              >
                <option value="">Tất cả</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Requests Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={9} />
      ) : (
      <div className={`card overflow-hidden p-0 transition-all duration-300 ${
        isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b">
                <th className="px-6 py-3 font-medium w-12">STT</th>
                <th className="px-6 py-3 font-medium">Tiêu đề</th>
                <th className="px-6 py-3 font-medium">Đơn vị</th>
                <th className="px-6 py-3 font-medium">Trạng thái</th>
                <th className="px-6 py-3 font-medium">Ưu tiên</th>
                <th className="px-6 py-3 font-medium">Danh mục</th>
                <th className="px-6 py-3 font-medium">Người gửi</th>
                <th className="px-6 py-3 font-medium">Người xử lý</th>
                <th className="px-6 py-3 font-medium">Hạn chót</th>
                <th className="px-6 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {false ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vnpt-blue mx-auto"></div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">
                      {activeTab === "new_created" && "📝"}
                      {activeTab === "transferred" && "📋"}
                      {activeTab === "assigned" && "👤"}
                      {activeTab === "completed" && "✅"}
                      {activeTab === "returned" && "🔄"}
                      {activeTab === "all" && "📄"}
                    </div>
                    <p>Không có yêu cầu nào trong mục này</p>
                  </td>
                </tr>
              ) : (
                sortedRequests.map((req: any, index: number) => {
                  const isOverdue =
                    req.deadline &&
                    new Date(req.deadline) < new Date() &&
                    !["resolved", "closed", "cancelled"].includes(req.status);
                  const isMine = req.requester?.id === (session?.user as any)?.id;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-center text-gray-500 font-medium">
                        {(pagination.page - 1) * 15 + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/requests/${req.id}`}
                            className="text-vnpt-blue hover:underline font-medium"
                          >
                            {req.title}
                          </Link>
                          {isMine && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-vnpt-lightblue text-vnpt-blue font-medium whitespace-nowrap">
                              Của tôi
                            </span>
                          )}
                        </div>
                        {req._count.comments > 0 && (
                          <span className="text-xs text-gray-400">
                            💬 {req._count.comments}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs max-w-[120px] truncate" title={req.donVi}>
                        {req.donVi || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={STATUS_BG_COLORS[req.status as keyof typeof STATUS_BG_COLORS]}
                        >
                          {STATUS_LABELS[req.status as keyof typeof STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={PRIORITY_BG_COLORS[req.priority as keyof typeof PRIORITY_BG_COLORS]}
                        >
                          {PRIORITY_LABELS[req.priority as keyof typeof PRIORITY_LABELS]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {req.category?.name || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-vnpt-lightblue flex items-center justify-center text-xs font-bold text-vnpt-blue">
                            {req.requester.name?.charAt(0) || "?"}
                          </div>
                          <span className="text-gray-700 text-xs">{req.requester.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {req.assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-vnpt-lightblue flex items-center justify-center text-xs font-bold text-vnpt-darkblue">
                              {req.assignee.name?.charAt(0) || "?"}
                            </div>
                            <span className="text-gray-700 text-xs">{req.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Chưa giao</span>
                        )}
                      </td>
                      <td
                        className={`px-6 py-4 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}
                      >
                        {req.deadline
                          ? new Date(req.deadline).toLocaleDateString("vi-VN")
                          : "—"}
                        {isOverdue && " ⚠️"}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/requests/${req.id}`}
                          className="text-vnpt-blue hover:bg-vnpt-lightblue px-2 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">
              Hiển thị {(pagination.page - 1) * perPage + 1} -{" "}
              {Math.min(pagination.page * perPage, pagination.total)} / {pagination.total} yêu cầu
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Hiển thị:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setFilters({ ...filters, page: 1 });
                }}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-vnpt-blue bg-white"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-500">/trang</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page <= 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page >= pagination.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
