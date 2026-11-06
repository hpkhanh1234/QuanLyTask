"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Building2,
  Link2,
  Activity,
  FileEdit,
  Workflow,
  Upload,
  X,
  File,
  Image,
  ArrowRight,
  FileText,
  UserCheck,
  CheckCircle,
  RotateCcw,
  Lock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { PRIORITY_LABELS } from "@/lib/types";
import { SkeletonForm } from "@/components/Skeleton";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
}

export default function NewRequestPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [form, setForm] = useState({
    title: "",
    priority: "medium",
    categoryId: "",
    assigneeId: "",
    deadline: "",
    linkSite: "",
    donVi: "",
    linkChucNang: "",
    hienTrang: "",
    noiDungDieuChinh: "",
    quyTrinhThaoTac: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((cats) => {
        setCategories(cats);
        setInitialLoading(false);
      });
  }, []);

  const workflowSteps: WorkflowStep[] = [
    {
      id: "new",
      title: "Mới khởi tạo",
      description: "Yêu cầu mới được tạo",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: "in_progress",
      title: "Đang xử lý",
      description: "Đã giao cho người xử lý",
      icon: UserCheck,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      id: "resolved",
      title: "Đã giải quyết",
      description: "Hoàn thành xử lý",
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      id: "closed",
      title: "Đã đóng",
      description: "Đóng hoàn toàn",
      icon: Lock,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
  ];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/"))
      return <Image className="w-5 h-5 text-green-500" />;
    return <File className="w-5 h-5 text-blue-500" />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          description: "Yêu cầu điều chỉnh",
          categoryId: form.categoryId || undefined,
          assigneeId: form.assigneeId || undefined,
          deadline: form.deadline || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        if (files.length > 0) {
          for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("requestId", data.id);
            await fetch("/api/upload", { method: "POST", body: formData });
          }
        }

        router.push(`/requests/${data.id}`);
      } else {
        const data = await res.json();
        alert(data.error || "Đã có lỗi xảy ra");
      }
    } catch {
      alert("Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/requests"
          className="text-vnpt-blue hover:underline text-sm flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-bold text-vnpt-darkblue">
          Tạo yêu cầu mới
        </h1>
        <p className="text-gray-600 mt-1">
          Điền thông tin bên dưới để tạo yêu cầu điều chỉnh
        </p>
      </div>

      {/* Workflow collapsible */}
      <div className="card mb-6">
        <button
          onClick={() => setShowWorkflow(!showWorkflow)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-vnpt-blue" />
            <h3 className="font-semibold text-gray-900">
              Quy trình xử lý yêu cầu
            </h3>
          </div>
          {showWorkflow ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showWorkflow && (
          <div className="mt-4">
            {/* Horizontal flow - centered and compact */}
            <div className="flex items-center justify-center gap-0">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${step.borderColor} ${step.bgColor}`}
                  >
                    <div className="p-1.5 rounded-lg bg-white">
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${step.color}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className="flex items-center mx-1">
                      <div className="w-4 h-0.5 bg-gray-300" />
                      <ChevronRight className="w-4 h-4 text-gray-400 -ml-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Additional info */}
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full">
                <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs text-orange-700 font-medium">
                  Bị trả lại
                </span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-vnpt-blue" />
                  Chuyển xử lý
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-vnpt-blue" />
                  Nhận thông báo
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-vnpt-blue" />
                  Xác nhận hoàn thành
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form - Full width */}
      <div className="card">
        {initialLoading ? (
          <SkeletonForm />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Title - full width */}
            <div>
              <label className="label">Tiêu đề yêu cầu *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field w-full"
                placeholder="Nhập tiêu đề tóm tắt yêu cầu..."
                required
              />
            </div>

            {/* Row 2: Link/Site + Đơn vị + Danh mục */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Globe className="w-4 h-4 text-vnpt-accent" />
                  Link / Site
                </label>
                <input
                  type="url"
                  value={form.linkSite}
                  onChange={(e) =>
                    setForm({ ...form, linkSite: e.target.value })
                  }
                  className="input-field"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-vnpt-accent" />
                  Đơn vị *
                </label>
                <input
                  type="text"
                  value={form.donVi}
                  onChange={(e) =>
                    setForm({ ...form, donVi: e.target.value })
                  }
                  className="input-field"
                  placeholder="VD: Phòng Kinh doanh..."
                  required
                />
              </div>
              <div>
                <label className="label">Danh mục</label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Link chức năng */}
            <div>
              <label className="label flex items-center gap-2">
                <Link2 className="w-4 h-4 text-vnpt-accent" />
                Link chức năng
              </label>
              <input
                type="url"
                value={form.linkChucNang}
                onChange={(e) =>
                  setForm({ ...form, linkChucNang: e.target.value })
                }
                className="input-field w-full"
                placeholder="https://app.example.com/function/..."
              />
            </div>

            {/* Row 4: Hiện trạng + Nội dung điều chỉnh side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Activity className="w-4 h-4 text-vnpt-accent" />
                  Hiện trạng
                </label>
                <textarea
                  value={form.hienTrang}
                  onChange={(e) =>
                    setForm({ ...form, hienTrang: e.target.value })
                  }
                  className="input-field"
                  rows={4}
                  placeholder="Mô tả hiện trạng hiện tại..."
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-vnpt-accent" />
                  Nội dung cần điều chỉnh *
                </label>
                <textarea
                  value={form.noiDungDieuChinh}
                  onChange={(e) =>
                    setForm({ ...form, noiDungDieuChinh: e.target.value })
                  }
                  className="input-field"
                  rows={4}
                  placeholder="Mô tả chi tiết nội dung cần điều chỉnh..."
                  required
                />
              </div>
            </div>

            {/* Row 5: Quy trình thao tác - full width */}
            <div>
              <label className="label flex items-center gap-2">
                <Workflow className="w-4 h-4 text-vnpt-accent" />
                Quy trình thao tác
              </label>
              <textarea
                value={form.quyTrinhThaoTac}
                onChange={(e) =>
                  setForm({ ...form, quyTrinhThaoTac: e.target.value })
                }
                className="input-field w-full"
                rows={4}
                placeholder={"Bước 1: ...\nBước 2: ...\nBước 3: ..."}
              />
            </div>

            {/* Row 6: Priority + Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Mức độ ưu tiên</label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  className="input-field"
                >
                  {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hạn chót</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                  className="input-field"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            {/* Row 7: File Upload */}
            <div>
              <label className="label flex items-center gap-2">
                <Upload className="w-4 h-4 text-vnpt-accent" />
                File đính kèm
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-vnpt-blue hover:bg-vnpt-lightblue/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFiles([
                    ...files,
                    ...Array.from(e.dataTransfer.files),
                  ]);
                }}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Kéo thả file vào đây hoặc{" "}
                  <span className="text-vnpt-blue font-medium">
                    chọn file
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Hỗ trợ: JPG, PNG, GIF, PDF, DOC, XLS, ZIP (tối đa
                  10MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                onChange={handleFileChange}
              />

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row 8: Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Đang tạo..." : "Tạo yêu cầu"}
              </button>
              <Link href="/requests" className="btn-secondary">
                Hủy
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
