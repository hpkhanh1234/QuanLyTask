"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Search, LogOut, Sun, Moon, Key, X, Loader2, CheckCircle } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import NotificationCenter from "./NotificationCenter";
import { useToast } from "./ToastProvider";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast({
        title: "Lỗi",
        message: "Mật khẩu mới không khớp",
        type: "error",
      });
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast({
        title: "Lỗi",
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        type: "error",
      });
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        showToast({
          title: "Thành công",
          message: "Đổi mật khẩu thành công",
          type: "success",
        });
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordSuccess(false);
        }, 2000);
      } else {
        showToast({
          title: "Lỗi",
          message: data.error || "Không thể đổi mật khẩu",
          type: "error",
        });
      }
    } catch {
      showToast({
        title: "Lỗi",
        message: "Đã có lỗi xảy ra",
        type: "error",
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <>
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 transition-colors duration-300">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm yêu cầu..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent bg-gray-50 focus:bg-white transition-all text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-300"
            title={theme === "light" ? "Chế độ tối" : "Chế độ sáng"}
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* Change Password */}
          <button
            onClick={() => setShowChangePassword(true)}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-300"
            title="Đổi mật khẩu"
          >
            <Key className="w-5 h-5" />
          </button>

          {/* Notification Center */}
          <NotificationCenter
            onNewNotification={(notification) => {
              showToast({
                title: notification.title,
                message: notification.message,
                type: notification.type,
                link: notification.link || undefined,
              });
            }}
          />

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0066B3]/10 rounded-xl">
                  <Key className="w-5 h-5 text-[#0066B3]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Đổi mật khẩu
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordSuccess(false);
                  setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {passwordSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Đổi mật khẩu thành công!
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Vui lòng sử dụng mật khẩu mới ở lần đăng nhập tiếp theo
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Mật khẩu hiện tại *
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent bg-gray-50 dark:bg-gray-700 dark:text-white"
                      placeholder="Nhập mật khẩu hiện tại"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Mật khẩu mới *
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent bg-gray-50 dark:bg-gray-700 dark:text-white"
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Xác nhận mật khẩu mới *
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent bg-gray-50 dark:bg-gray-700 dark:text-white"
                      placeholder="Nhập lại mật khẩu mới"
                      required
                      minLength={6}
                    />
                    {passwordForm.newPassword && passwordForm.confirmPassword &&
                      passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">
                          Mật khẩu không khớp
                        </p>
                      )}
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordSuccess(false);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  {passwordSuccess ? "Đóng" : "Hủy"}
                </button>
                {!passwordSuccess && (
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-[#0066B3] hover:bg-[#005299] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      "Đổi mật khẩu"
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
