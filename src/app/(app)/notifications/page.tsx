"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  UserPlus,
  Clock,
  Inbox,
} from "lucide-react";
import { SkeletonNotifications } from "@/components/Skeleton";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  async function fetchNotifications() {
    setLoading(true);
    const params = filter === "unread" ? "?unreadOnly=true" : "";
    const res = await fetch(`/api/notifications${params}`);
    const data = await res.json();
    setNotifications(data.notifications || []);
    setLoading(false);
  }

  async function markAsRead(ids: string[]) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: ids }),
    });
    fetchNotifications();
  }

  async function markAllAsRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    fetchNotifications();
  }

  function getIconConfig(type: string) {
    switch (type) {
      case "comment":
        return {
          icon: MessageSquare,
          color: "text-blue-600",
          bg: "bg-blue-100",
        };
      case "status_change":
        return {
          icon: RefreshCw,
          color: "text-emerald-600",
          bg: "bg-emerald-100",
        };
      case "assignment":
        return {
          icon: UserPlus,
          color: "text-purple-600",
          bg: "bg-purple-100",
        };
      case "overdue":
        return {
          icon: AlertTriangle,
          color: "text-red-600",
          bg: "bg-red-100",
        };
      default:
        return {
          icon: Bell,
          color: "text-gray-600",
          bg: "bg-gray-100",
        };
    }
  }

  function formatTimeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
          <p className="text-gray-500 mt-1">
            Theo dõi cập nhật mới nhất
            {unreadCount > 0 && (
              <span className="ml-2 text-sm font-medium text-[#0066B3]">
                ({unreadCount} chưa đọc)
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Đánh dấu đã đọc tất cả
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            filter === "all"
              ? "bg-[#0066B3] text-white shadow-lg shadow-blue-500/20"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <Bell className="w-4 h-4" />
          Tất cả
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            filter === "unread"
              ? "bg-[#0066B3] text-white shadow-lg shadow-blue-500/20"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <Inbox className="w-4 h-4" />
          Chưa đọc
          {unreadCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <SkeletonNotifications count={5} />
        ) : notifications.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Không có thông báo nào</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "unread"
                ? "Tất cả thông báo đã được đọc"
                : "Chưa có thông báo mới"}
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const iconConfig = getIconConfig(notif.type);
            const IconComponent = iconConfig.icon;

            return (
              <div
                key={notif.id}
                className={`card flex items-start gap-4 cursor-pointer transition-all duration-200 ${
                  !notif.isRead
                    ? "bg-gradient-to-r from-blue-50 to-white border-blue-200 hover:border-blue-300"
                    : "hover:bg-gray-50 hover:border-gray-300"
                }`}
                onClick={() => {
                  if (!notif.isRead) markAsRead([notif.id]);
                  if (notif.link) window.location.href = notif.link;
                }}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 p-3 rounded-xl ${iconConfig.bg}`}
                >
                  <IconComponent
                    className={`w-5 h-5 ${iconConfig.color}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm ${
                        !notif.isRead ? "font-semibold" : "font-medium"
                      } text-gray-900`}
                    >
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0066B3] flex-shrink-0 mt-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0066B3] animate-ping" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-400">
                      {formatTimeAgo(notif.createdAt)}
                    </p>
                    {notif.link && (
                      <span className="text-xs text-[#0066B3] hover:underline">
                        Xem chi tiết →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
