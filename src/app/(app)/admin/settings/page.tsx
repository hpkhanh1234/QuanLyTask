"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Settings, Info, Shield, MessageCircle, Clock, Bell, Zap, MessageSquare, CalendarClock } from "lucide-react";
import TelegramConnect from "@/components/TelegramConnect";
import TelegramConfig from "@/components/TelegramConfig";
import BatScheduler from "@/components/BatScheduler";

type Tab = "workflow" | "telegram" | "reports" | "system";

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const [activeTab, setActiveTab] = useState<Tab>("workflow");

  useEffect(() => {
    if (role !== "admin") {
      router.push("/dashboard");
    }
  }, [role]);

  if (role !== "admin") return null;

  const tabs = [
    { id: "workflow" as Tab, label: "Quy trình & Phân quyền", icon: Zap },
    { id: "telegram" as Tab, label: "Telegram", icon: MessageSquare },
    { id: "reports" as Tab, label: "Báo cáo tự động", icon: CalendarClock },
    { id: "system" as Tab, label: "Hệ thống", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-vnpt-darkblue">Cài đặt hệ thống</h1>
        <p className="text-gray-600 mt-1">Cấu hình quy trình, thông báo và thông tin hệ thống</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-vnpt-blue text-vnpt-blue bg-vnpt-lightblue/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {/* ═══ Tab 1: Workflow & RBAC ═══ */}
        {activeTab === "workflow" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workflow */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-vnpt-accent" />
                <h3 className="text-lg font-semibold text-vnpt-darkblue">Quy tắc làm việc</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-mono">🆕 Mới tạo</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-xs">Đang xử lý / Đã hủy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-mono">🔄 Đang xử lý</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-xs">Chờ phản hồi / Đã giải quyết / Đã hủy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-mono">⏳ Chờ phản hồi</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-xs">Đang xử lý / Đã giải quyết / Đã hủy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-mono">✅ Đã giải quyết</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-xs">Đã đóng / Đang xử lý</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-mono">🔒 Đã đóng</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-xs text-gray-500">(không thể thay đổi)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-mono">❌ Đã hủy</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-xs">Mới tạo (khôi phục)</span>
                </div>
              </div>
            </div>

            {/* RBAC */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-vnpt-accent" />
                <h3 className="text-lg font-semibold text-vnpt-darkblue">Phân quyền (RBAC)</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-lg">📝</span>
                  <div>
                    <h4 className="font-medium text-green-900 text-sm">Người gửi (Requester)</h4>
                    <ul className="text-xs text-green-700 mt-1 space-y-0.5">
                      <li>• Tạo, sửa, xóa yêu cầu mới</li>
                      <li>• Xem yêu cầu của mình</li>
                      <li>• Xác nhận / từ chối hoàn thành</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-lg">🛠️</span>
                  <div>
                    <h4 className="font-medium text-blue-900 text-sm">Người xử lý (Agent)</h4>
                    <ul className="text-xs text-blue-700 mt-1 space-y-0.5">
                      <li>• Xem yêu cầu được giao</li>
                      <li>• Chuyển xử lý, trả lại người tạo</li>
                      <li>• Thay đổi trạng thái, bình luận</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <span className="text-lg">👑</span>
                  <div>
                    <h4 className="font-medium text-red-900 text-sm">Quản trị viên (Admin)</h4>
                    <ul className="text-xs text-red-700 mt-1 space-y-0.5">
                      <li>• Toàn quyền quản lý hệ thống</li>
                      <li>• Quản lý người dùng, danh mục</li>
                      <li>• Xem báo cáo, khóa yêu cầu</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Tab 2: Telegram ═══ */}
        {activeTab === "telegram" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Connect + Config */}
            <div className="space-y-6">
              <TelegramConnect />
            </div>

            {/* Right Column: Config */}
            <div className="space-y-6">
              <TelegramConfig />
            </div>
          </div>
        )}

        {/* ═══ Tab 3: Scheduled report (.bat) ═══ */}
        {activeTab === "reports" && <BatScheduler />}

        {/* ═══ Tab 4: System ═══ */}
        {activeTab === "system" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Info */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-vnpt-accent" />
                <h3 className="text-lg font-semibold text-vnpt-darkblue">Thông tin hệ thống</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Tên hệ thống</span>
                  <span className="font-medium text-vnpt-darkblue">Quản lý Yêu cầu</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Phiên bản</span>
                  <span className="font-medium text-vnpt-darkblue">1.0.0</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Quản trị hiện tại</span>
                  <span className="font-medium text-vnpt-darkblue">{session?.user?.name}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-600">Cơ sở dữ liệu</span>
                  <span className="font-medium text-vnpt-darkblue">SQLite</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-vnpt-accent" />
                <h3 className="text-lg font-semibold text-vnpt-darkblue">Tính năng hiện có</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">3</p>
                  <p className="text-xs text-gray-600">Vai trò</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">6</p>
                  <p className="text-xs text-gray-600">Trạng thái</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">4</p>
                  <p className="text-xs text-gray-600">Mức ưu tiên</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">5</p>
                  <p className="text-xs text-gray-600">Kho yêu cầu</p>
                </div>
              </div>
            </div>

            {/* Shortcuts */}
            <div className="card lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-vnpt-accent" />
                <h3 className="text-lg font-semibold text-vnpt-darkblue">Liên kết nhanh</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <a
                  href="/admin/users"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-vnpt-lightblue transition-colors"
                >
                  <span className="text-lg">👤</span>
                  <span className="text-sm font-medium text-vnpt-darkblue">Người dùng</span>
                </a>
                <a
                  href="/admin/categories"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-vnpt-lightblue transition-colors"
                >
                  <span className="text-lg">📂</span>
                  <span className="text-sm font-medium text-vnpt-darkblue">Danh mục</span>
                </a>
                <a
                  href="/admin/priorities"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-vnpt-lightblue transition-colors"
                >
                  <span className="text-lg">🏷️</span>
                  <span className="text-sm font-medium text-vnpt-darkblue">Ưu tiên</span>
                </a>
                <a
                  href="/admin/help"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-vnpt-lightblue transition-colors"
                >
                  <span className="text-lg">❓</span>
                  <span className="text-sm font-medium text-vnpt-darkblue">Hướng dẫn</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
