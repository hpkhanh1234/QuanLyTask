"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users, Shield, Wrench, UserCheck, Plus, Pencil, Trash2, X,
  UserX, UserCog, Save, AlertTriangle, Mail, Building2, Lock,
  MessageSquare, Send, Loader2,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/types";
import { SkeletonTable } from "@/components/Skeleton";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "requester", department: "" });
  const [showInactive, setShowInactive] = useState(false);
  const [editingTelegram, setEditingTelegram] = useState<any>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  const role = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;

  useEffect(() => {
    if (role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [role, showInactive]);

  async function fetchUsers() {
    setLoading(true);
    const params = showInactive ? "?includeInactive=true" : "";
    const res = await fetch(`/api/users${params}`);
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  // ── Create user ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "requester", department: "" });
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể tạo người dùng");
    }
  }

  // ── Edit user ──
  async function handleEdit(user: any) {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
      department: user.department || "",
    });
    setShowForm(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    const body: any = {
      name: form.name,
      role: form.role,
      department: form.department || null,
    };
    if (form.password) body.password = form.password;

    const res = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowForm(false);
      setEditingUser(null);
      setForm({ name: "", email: "", password: "", role: "requester", department: "" });
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể cập nhật");
    }
  }

  // ── Toggle active ──
  async function handleToggleActive(user: any) {
    const action = user.isActive ? "vô hiệu hóa" : "kích hoạt";
    if (!confirm(`Bạn có chắc muốn ${action} "${user.name}"?`)) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) fetchUsers();
  }

  // ── Assign Telegram ──
  async function handleAssignTelegram(user: any) {
    setEditingTelegram(user);
    setTelegramChatId(user.telegramChatId || "");
  }

  async function handleSaveTelegram() {
    if (!editingTelegram) return;
    const res = await fetch(`/api/users/${editingTelegram.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramChatId: telegramChatId || null }),
    });
    if (res.ok) {
      setEditingTelegram(null);
      setTelegramChatId("");
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể cập nhật");
    }
  }

  // ── Send test Telegram ──
  async function handleSendTestTelegram(user: any) {
    setSendingTest(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/telegram-test`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        alert(data.error || "Không thể gửi tin nhắn");
      }
    } catch (error) {
      alert("Đã có lỗi xảy ra");
    } finally {
      setSendingTest(null);
    }
  }

  // ── Delete user ──
  async function handleDelete(user: any) {
    if (!confirm(`Bạn có chắc muốn xóa "${user.name}"? Hành động này không thể hoàn tác.`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
    else {
      const data = await res.json();
      alert(data.error || "Không thể xóa");
    }
  }

  if (role !== "admin") return null;

  const roleIcon = (r: string) => {
    switch (r) {
      case "admin": return <Shield className="w-4 h-4 text-red-500" />;
      case "agent": return <Wrench className="w-4 h-4 text-blue-500" />;
      default: return <UserCheck className="w-4 h-4 text-green-500" />;
    }
  };

  const roleColor = (r: string) => {
    switch (r) {
      case "admin": return { backgroundColor: "#FEE2E2", color: "#991B1B" };
      case "agent": return { backgroundColor: "#DBEAFE", color: "#1E40AF" };
      default: return { backgroundColor: "#D1FAE5", color: "#065F46" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vnpt-darkblue">Quản lý người dùng</h1>
          <p className="text-gray-600 mt-1">Thêm, sửa, phân quyền và quản lý tài khoản</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setForm({ name: "", email: "", password: "", role: "requester", department: "" }); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm người dùng
        </button>
      </div>

      {/* ── Form Create/Edit ── */}
      {showForm && (
        <div className="card border-2 border-vnpt-blue/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-vnpt-darkblue">
              {editingUser ? `Sửa: ${editingUser.name}` : "Thêm người dùng mới"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingUser(null); }} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={editingUser ? handleSaveEdit : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Users className="w-4 h-4 text-vnpt-accent" /> Họ tên *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Mail className="w-4 h-4 text-vnpt-accent" /> Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Lock className="w-4 h-4 text-vnpt-accent" /> Mật khẩu {editingUser ? "(để trống nếu không đổi)" : "*"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-vnpt-accent" /> Phòng ban
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="input-field"
                  placeholder="VD: Phòng IT, Bộ phận Hành chính..."
                />
              </div>
            </div>
            <div>
              <label className="label flex items-center gap-2">
                <UserCog className="w-4 h-4 text-vnpt-accent" /> Vai trò *
              </label>
              <div className="flex gap-3">
                {(["requester", "agent", "admin"] as const).map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      form.role === r
                        ? "border-vnpt-blue bg-vnpt-lightblue"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={form.role === r}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="sr-only"
                    />
                    {roleIcon(r)}
                    <span className="text-sm font-medium">{ROLE_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editingUser ? "Lưu thay đổi" : "Tạo tài khoản"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingUser(null); }} className="btn-secondary">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Toggle show inactive ── */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Hiển thị tài khoản đã vô hiệu hóa
        </label>
      </div>

      {/* ── Telegram Edit Modal ── */}
      {editingTelegram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-vnpt-darkblue">
                  Gán Telegram cho {editingTelegram.name}
                </h3>
              </div>
              <button
                onClick={() => { setEditingTelegram(null); setTelegramChatId(""); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Telegram Chat ID</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="VD: 123456789"
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Để trống để ngắt kết nối Telegram của người dùng này
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <p className="font-medium mb-1">📌 Hướng dẫn lấy Chat ID:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Nhân viên mở Telegram và tìm bot của hệ thống</li>
                  <li>Nhấn /start để bắt đầu</li>
                  <li>Sử dụng @userinfobot để lấy Chat ID</li>
                  <li>Dán Chat ID vào ô trên</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => { setEditingTelegram(null); setTelegramChatId(""); }}
                className="btn-secondary"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTelegram}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Users Table ── */}
      {loading ? (
        <SkeletonTable rows={5} cols={8} />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50 border-b">
                  <th className="px-6 py-3 font-medium">Người dùng</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Vai trò</th>
                  <th className="px-6 py-3 font-medium">Phòng ban</th>
                  <th className="px-6 py-3 font-medium">Telegram</th>
                  <th className="px-6 py-3 font-medium">Yêu cầu</th>
                  <th className="px-6 py-3 font-medium">Trạng thái</th>
                  <th className="px-6 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Không có người dùng nào
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr key={user.id} className={`hover:bg-gray-50 ${!user.isActive ? "opacity-50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-vnpt-lightblue flex items-center justify-center text-sm font-bold text-vnpt-blue">
                            {user.name?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium text-gray-900">{user.name}</span>
                          {user.id === currentUserId && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Bạn</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={roleColor(user.role)}
                        >
                          {roleIcon(user.role)}
                          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">{user.department || "—"}</td>
                      <td className="px-6 py-4">
                        {user.telegramChatId ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <MessageSquare className="w-3 h-3" />
                              Đã kết nối
                            </span>
                            <button
                              onClick={() => handleAssignTelegram(user)}
                              className="text-amber-500 hover:text-amber-700"
                              title="Sửa Telegram"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSendTestTelegram(user)}
                              disabled={sendingTest === user.id}
                              className="text-blue-500 hover:text-blue-700"
                              title="Gửi tin nhắn test"
                            >
                              {sendingTest === user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAssignTelegram(user)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Gán Telegram
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        <span title="Đang xử lý">{user._count?.requestsAssigned || 0}</span>
                        {" / "}
                        <span title="Tổng đã tạo">{user._count?.requestsCreated || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={user.isActive
                            ? { backgroundColor: "#D1FAE5", color: "#065F46" }
                            : { backgroundColor: "#FEE2E2", color: "#991B1B" }
                          }
                        >
                          {user.isActive ? "Hoạt động" : "Vô hiệu"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 rounded hover:bg-vnpt-lightblue text-vnpt-blue transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {user.id !== currentUserId && (
                            <>
                              <button
                                onClick={() => handleToggleActive(user)}
                                className="p-1.5 rounded hover:bg-orange-100 text-orange-600 transition-colors"
                                title={user.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(user)}
                                className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
