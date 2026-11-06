"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Pencil, X, Save, FolderOpen, Palette, FileText,
} from "lucide-react";
import { SkeletonCard } from "@/components/Skeleton";

export default function AdminCategoriesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#3b82f6" });

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchCategories();
  }, [role]);

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }

  // ── Create ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", description: "", color: "#3b82f6" });
      setShowForm(false);
      fetchCategories();
    } else {
      const data = await res.json();
      alert(data.error || "Đã có lỗi xảy ra");
    }
  }

  // ── Edit ──
  function handleEdit(cat: any) {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || "", color: cat.color });
    setShowForm(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await fetch(`/api/categories/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", description: "", color: "#3b82f6" });
      fetchCategories();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể cập nhật");
    }
  }

  // ── Delete ──
  async function handleDelete(cat: any) {
    const msg = cat._count?.requests > 0
      ? `Danh mục "${cat.name}" có ${cat._count.requests} yêu cầu. Sẽ ẩn thay vì xóa. Tiếp tục?`
      : `Bạn có chắc muốn xóa danh mục "${cat.name}"?`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) fetchCategories();
    else {
      const data = await res.json();
      alert(data.error || "Không thể xóa");
    }
  }

  if (role !== "admin") return null;

  const PRESET_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vnpt-darkblue">Quản lý danh mục</h1>
          <p className="text-gray-600 mt-1">Thêm, sửa và quản lý các danh mục yêu cầu</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: "", description: "", color: "#3b82f6" }); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm danh mục
        </button>
      </div>

      {/* ── Form Create/Edit ── */}
      {showForm && (
        <div className="card border-2 border-vnpt-blue/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-vnpt-darkblue">
              {editing ? `Sửa danh mục: ${editing.name}` : "Danh mục mới"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={editing ? handleSaveEdit : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-vnpt-accent" /> Tên danh mục *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="VD: Hỗ trợ IT, Nhân sự, Tài chính..."
                  required
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <FileText className="w-4 h-4 text-vnpt-accent" /> Mô tả
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  placeholder="Mô tả ngắn về danh mục"
                />
              </div>
            </div>
            <div>
              <label className="label flex items-center gap-2">
                <Palette className="w-4 h-4 text-vnpt-accent" /> Màu sắc
              </label>
              <div className="flex items-center gap-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      form.color === c ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editing ? "Lưu thay đổi" : "Tạo danh mục"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Categories Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="card text-center py-12">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat: any) => (
            <div key={cat.id} className={`card group ${!cat.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-4">
                <div
                  className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0 ring-2 ring-white shadow"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 truncate">{cat.name}</h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="p-1 rounded hover:bg-vnpt-lightblue text-vnpt-blue"
                        title="Sửa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1 rounded hover:bg-red-100 text-red-600"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {cat.description && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{cat.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">
                      {cat._count?.requests || 0} yêu cầu
                    </span>
                    {!cat.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">Đã ẩn</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
