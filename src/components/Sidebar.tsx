"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Bell,
  BarChart3,
  Settings,
  Users,
  FolderOpen,
  Tag,
  Shield,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
} from "lucide-react";
import { useSession } from "next-auth/react";

const navigation = [
  { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { name: "Yêu cầu", href: "/requests", icon: FileText },
  { name: "Tạo yêu cầu", href: "/requests/new", icon: PlusCircle },
  { name: "Thông báo", href: "/notifications", icon: Bell },
  { name: "Báo cáo", href: "/reports", icon: BarChart3 },
];

const adminNav = [
  { name: "Quản lý người dùng", href: "/admin/users", icon: Users },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Mức độ ưu tiên", href: "/admin/priorities", icon: Tag },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
  { name: "Hướng dẫn sử dụng", href: "/admin/help", icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [collapsed, setCollapsed] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(true);

  // Auto-open admin menu if user is on admin page
  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setAdminMenuOpen(true);
    }
  }, [pathname]);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  return (
    <aside className={`${collapsed ? "w-[72px]" : "w-64"} bg-gradient-to-b from-[#003B6F] to-[#002D54] text-white min-h-screen flex flex-col shadow-xl transition-all duration-300`}>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="8" fill="white"/>
                  <path d="M10 12h20v2H10v-2zm0 5h20v2H10v-2zm0 5h14v2H10v-2z" fill="#0066B3"/>
                  <circle cx="30" cy="27" r="6" fill="#00A651"/>
                  <path d="M28 27l1.5 1.5L32 26" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">QL Yêu cầu</h1>
                <p className="text-[10px] text-blue-200">Request Management</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="8" fill="white"/>
                <path d="M10 12h20v2H10v-2zm0 5h20v2H10v-2zm0 5h14v2H10v-2z" fill="#0066B3"/>
                <circle cx="30" cy="27" r="6" fill="#00A651"/>
                <path d="M28 27l1.5 1.5L32 26" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-blue-200 hover:text-white"
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => {
          let isActive = pathname === item.href;
          // For /requests, match detail pages (/requests/[id]) but NOT /requests/new
          if (!isActive && item.href === "/requests") {
            isActive = /^\/requests\/[a-f0-9-]+/.test(pathname);
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/20 text-white shadow-lg shadow-black/10"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && item.name}
            </Link>
          );
        })}

        {(role === "admin") && (
          <div className="pt-4">
            {/* Admin Menu Header */}
            <button
              onClick={() => {
                if (collapsed) {
                  setAdminMenuOpen(true);
                } else {
                  setAdminMenuOpen(!adminMenuOpen);
                }
              }}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider hover:text-blue-200 transition-colors rounded-xl hover:bg-white/10`}
              title={collapsed ? "Quản trị" : undefined}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                {!collapsed && <span>Quản trị</span>}
              </div>
              {!collapsed && (
                adminMenuOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              )}
            </button>

            {/* Admin Menu Items */}
            <div className={`overflow-hidden transition-all duration-300 ${adminMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="space-y-1 mt-1">
                {adminNav.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 ${collapsed ? "" : "ml-2"} rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-white/20 text-white shadow-lg shadow-black/10"
                          : "text-blue-100 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/10">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm font-bold text-white shrink-0">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-blue-200 truncate">
                {role === "admin"
                  ? "Quản trị viên"
                  : role === "agent"
                  ? "Người xử lý"
                  : "Người gửi"}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
