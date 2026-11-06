"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Tag, Plus, Pencil, Trash2, X, Save,
  ArrowUp, ArrowDown, Palette,
} from "lucide-react";
import { SkeletonCard } from "@/components/Skeleton";

export default function AdminPrioritiesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ key: "", label: "", bgColor: "#DBEAFE", textColor: "#1E40AF" });

  useEffect(() => {
    if (role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchPriorities();
  }, [role]);

  async function fetchPriorities() {
    const res = await fetch("/api/priorities");
    const data = await res.json();
    setPriorities(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/priorities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sortOrder: priorities.length }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ key: "", label: "", bgColor: "#DBEAFE", textColor: "#1E40AF" });
      fetchPriorities();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể tạo");
    }
  }

  function handleEdit(p: any) {
    setEditing(p);
    setForm({ key: p.key, label: p.label, bgColor: p.bgColor, textColor: p.textColor });
    setShowForm(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await fetch(`/api/priorities/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: form.label, bgColor: form.bgColor, textColor: form.textColor }),
    });
    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      setForm({ key: "", label: "", bgColor: "#DBEAFE", textColor: "#1E40AF" });
      fetchPriorities();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể cập nhật");
    }
  }

  async function handleDelete(p: any) {
    if (!confirm(`Xóa mức độ "${p.label}"?`)) return;
    const res = await fetch(`/api/priorities/${p.id}`, { method: "DELETE" });
    if (res.ok) fetchPriorities();
    else {
      const data = await res.json();
      alert(data.error || "Không thể xóa");
    }
  }

  async function handleMove(id: string, direction: "up" | "down") {
    const idx = priorities.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= priorities.length) return;

    const a = priorities[idx];
    const b = priorities[swapIdx];

    await Promise.all([
      fetch(`/api/priorities/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      }),
      fetch(`/api/priorities/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      }),
    ]);
    fetchPriorities();
  }

  if (role !== "admin") return null;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vnpt-darkblue">Mức độ ưu tiên</h1>
        <p className="text-gray-600 mt-1">Quản lý các mức độ ưu tiên cho yêu cầu</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-vnpt-accent" />
            <h3 className="text-lg font-semibold text-vnpt-darkblue">Danh sách mức ưu tiên</h3>
          </div>
          <button
            onClick={() => { setEditing(null); setForm({ key: "", label: "", bgColor: "#DBEAFE", textColor: "#1E40AF" }); setShowForm(true); }}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Thêm
          </button>
        </div>

        {showForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <form onSubmit={editing ? handleSaveEdit : handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {!editing && (
                  <div>
                    <label className="label text-xs">Key (mã)</label>
                    <input
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value })}
                      className="input-field text-sm"
                      placeholder="VD: critical"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="label text-xs">Tên hiển thị *</label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="input-field text-sm"
                    placeholder="VD: Rất quan trọng"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Màu nền</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                    <span className="text-xs text-gray-500">{form.bgColor}</span>
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Màu chữ</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.textColor} onChange={(e) => setForm({ ...form, textColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                    <span className="text-xs text-gray-500">{form.textColor}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Xem trước:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: form.bgColor, color: form.textColor }}>
                  {form.label || "Label"}
                </span>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" /> {editing ? "Lưu" : "Tạo"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary text-sm">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : priorities.length === 0 ? (
          <p className="text-center text-gray-500 py-6">Chưa có mức độ ưu tiên nào</p>
        ) : (
          <div className="space-y-2">
            {priorities.map((p: any, idx: number) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMove(p.id, "up")}
                    disabled={idx === 0}
                    className="p-0.5 text-gray-400 hover:text-vnpt-blue disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleMove(p.id, "down")}
                    disabled={idx === priorities.length - 1}
                    className="p-0.5 text-gray-400 hover:text-vnpt-blue disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium min-w-[100px] justify-center"
                  style={{ backgroundColor: p.bgColor, color: p.textColor }}
                >
                  {p.label}
                </span>
                <span className="text-xs text-gray-400 font-mono">{p.key}</span>
                <div className="flex-1" />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(p)} className="p-1 rounded hover:bg-white text-vnpt-blue" title="Sửa">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p)} className="p-1 rounded hover:bg-white text-red-600" title="Xóa">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
