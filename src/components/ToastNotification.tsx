"use client";

import { useState, useEffect, useCallback } from "react";
import { X, FileText, MessageSquare, AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface Toast {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  assignment: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  status_change: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  comment: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  overdue: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  deadline: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
};

interface ToastNotificationProps {
  notification: Toast | null;
  onDismiss: () => void;
}

export default function ToastNotification({ notification, onDismiss }: ToastNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      setExiting(false);

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 300);
  }, [onDismiss]);

  if (!notification || !visible) return null;

  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.assignment;
  const Icon = config.icon;

  return (
    <div
      className={`fixed top-20 right-6 z-[100] max-w-sm w-full transform transition-all duration-300 ${
        exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      <div
        className={`${config.bg} ${config.border} border rounded-xl shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow`}
        onClick={() => {
          if (notification.link) {
            window.location.href = notification.link;
          }
          handleDismiss();
        }}
      >
        <div className="flex gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm">
                {notification.title}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Global toast manager
let toastCallback: ((notification: Toast) => void) | null = null;

export function showToast(notification: Toast) {
  if (toastCallback) {
    toastCallback(notification);
  }
}

export function registerToastCallback(callback: (notification: Toast) => void) {
  toastCallback = callback;
}

export function unregisterToastCallback() {
  toastCallback = null;
}
