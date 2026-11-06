"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  User,
  Users,
  Calendar,
  Tag,
  MessageSquare,
  History,
  Send,
  AlertTriangle,
  CheckCircle,
  Globe,
  Building2,
  Link2,
  Activity,
  FileEdit,
  Workflow,
  Trash2,
  UserPlus,
  RotateCcw,
  Lock,
  Pencil,
  X,
  ArrowRightLeft,
  ThumbsUp,
  ThumbsDown,
  Upload,
  File,
  Image,
  GitBranch,
} from "lucide-react";
import FlowDiagram from "@/components/FlowDiagram";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_BG_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_BG_COLORS,
  PRIORITY_LABELS as PRIORITY_ALL,
  STATUS_FLOW,
  RequestStatus,
} from "@/lib/types";
import { SkeletonDetail } from "@/components/Skeleton";

export default function RequestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"comments" | "history" | "flow">("comments");
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // ── Transfer modal state ──
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferToIds, setTransferToIds] = useState<string[]>([]);
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  // ── Reject modal state ──
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  // Determine which tab/kho this request belongs to for the current user
  const isRequester = request?.requesterId === userId;
  const isAssignee = request?.assigneeId === userId;
  const status = request?.status as string;

  // Status group - based on user's definition:
  // - "Mới khởi tạo" = status 'new' + no assignee
  // - "Đã chuyển xử lý" = status 'in_progress' + has assignee
  const statusGroup =
    status === "new" && !request?.assigneeId ? "new_created" :
    ["in_progress", "waiting_response"].includes(status) && request?.assigneeId ? "transferred" :
    ["resolved", "closed"].includes(status) ? "completed" :
    status === "cancelled" ? "returned" :
    "other";

  useEffect(() => {
    fetchRequest();
    fetch("/api/users").then((r) => r.json()).then(setUsers);
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, [id]);

  async function fetchRequest() {
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) {
      const data = await res.json();
      setRequest(data);
      setEditForm({
        title: data.title,
        linkSite: data.linkSite || "",
        donVi: data.donVi || "",
        linkChucNang: data.linkChucNang || "",
        hienTrang: data.hienTrang || "",
        noiDungDieuChinh: data.noiDungDieuChinh || "",
        quyTrinhThaoTac: data.quyTrinhThaoTac || "",
        priority: data.priority,
        categoryId: data.categoryId || "",
        deadline: data.deadline ? new Date(data.deadline).toISOString().split("T")[0] : "",
      });
    }
    setLoading(false);
  }

  // ─── Status change ───
  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchRequest();
    else {
      const data = await res.json();
      alert(data.error || "Không thể thay đổi trạng thái");
    }
  }

  // ─── Transfer (assign) with reason - supports multiple assignees ───
  async function handleTransfer() {
    const assigneeIds = transferToIds.length > 0 ? transferToIds : (transferTo ? [transferTo] : []);
    if (assigneeIds.length === 0) return;
    setTransferring(true);
    
    // Determine new status: if currently 'new' or 'cancelled', auto-change to 'in_progress'
    const newStatus = ["new", "cancelled"].includes(status) ? "in_progress" : status;
    
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assigneeIds: assigneeIds,
        status: newStatus,
        transferReason: transferReason || undefined,
      }),
    });
    if (res.ok) {
      setShowTransferModal(false);
      setTransferTo("");
      setTransferToIds([]);
      setTransferReason("");
      setEditingAssignee(false);
      fetchRequest();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể chuyển xử lý");
    }
    setTransferring(false);
  }

  // ─── Requester rejects (sends back to in_progress) ───
  async function handleReject() {
    const reason = rejectReason.trim();
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    if (res.ok) {
      // Add a comment with the rejection reason
      if (reason) {
        await fetch(`/api/requests/${id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `[Từ chối hoàn thành] ${reason}`,
            isInternal: false,
          }),
        });
      }
      setShowRejectModal(false);
      setRejectReason("");
      fetchRequest();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể thực hiện");
    }
  }

  // ─── Delete ───
  async function handleDelete() {
    if (!confirm("Bạn có chắc chắn muốn xóa yêu cầu này?")) return;
    const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/requests");
    else {
      const data = await res.json();
      alert(data.error || "Không thể xóa");
    }
  }

  // ─── Edit save ───
  async function handleSaveEdit() {
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditing(false);
      fetchRequest();
    } else {
      const data = await res.json();
      alert(data.error || "Không thể cập nhật");
    }
  }

  // ─── Comment ───
  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/requests/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: newComment,
        isInternal: role !== "requester" && isInternal,
      }),
    });
    if (res.ok) {
      setNewComment("");
      setIsInternal(false);
      fetchRequest();
    }
    setSubmitting(false);
  }

  if (loading) return <SkeletonDetail />;

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy yêu cầu</p>
        <Link href="/requests" className="text-vnpt-blue hover:underline mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const isOverdue =
    request.deadline &&
    new Date(request.deadline) < new Date() &&
    !["resolved", "closed", "cancelled"].includes(request.status);

  // ─── Permissions ───
  const canComment = ["in_progress", "waiting_response", "resolved"].includes(status) ||
    (status === "new" && request.assigneeId);

  const canDelete =
    role === "admin" ||
    (statusGroup === "new_created" && isRequester) ||
    (statusGroup === "returned" && isRequester);

  const canEdit =
    (statusGroup === "new_created" && isRequester) ||
    (statusGroup === "returned" && isRequester) ||
    role === "admin";

  const canTransfer = role !== "requester";

  const canReturn = role !== "requester" && ["in_progress", "waiting_response"].includes(status);

  const canLock = role === "admin" && status === "resolved";

  // ── Requester can confirm or reject when status is resolved ──
  const canConfirmComplete = isRequester && status === "resolved";
  const canRejectComplete = isRequester && status === "resolved";

  // Available agents for transfer
  const availableAgents = users.filter(
    (u: any) => (u.role === "agent" || u.role === "admin") && u.id !== userId
  );

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link
          href="/requests"
          className="text-vnpt-blue hover:underline text-sm flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
      </div>

      {/* ── Banner: Yêu cầu chờ xác nhận ── */}
      {canConfirmComplete && (
        <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-green-800 font-bold text-lg">Yêu cầu đã được xử lý xong</h3>
              <p className="text-green-700 text-sm mt-1">
                Người xử lý đã đánh dấu hoàn thành. Vui lòng kiểm tra kết quả và xác nhận.
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleStatusChange("closed")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md"
                >
                  <ThumbsUp className="w-5 h-5" />
                  Xác nhận hoàn thành
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-md"
                >
                  <ThumbsDown className="w-5 h-5" />
                  Chưa hài lòng — Yêu cầu xử lý lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Banner: Yêu cầu chờ xác nhận (agent sees) ── */}
      {status === "resolved" && !isRequester && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-vnpt-blue" />
            <p className="text-vnpt-darkblue text-sm font-medium">
              Yêu cầu đang chờ người gửi xác nhận hoàn thành...
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Title & Status */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                {editing ? (
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="input-field text-xl font-bold mb-1"
                  />
                ) : (
                  <h1 className="text-xl font-bold text-gray-900">{request.title}</h1>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  ID: {request.id.slice(0, 8)}
                </p>
              </div>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={STATUS_BG_COLORS[request.status as keyof typeof STATUS_BG_COLORS]}
              >
                {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}
              </span>
            </div>

            {isOverdue && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-700 text-sm font-medium">
                  Yêu cầu này đã quá hạn xử lý!
                </span>
              </div>
            )}

            {/* Domain-specific fields */}
            <div className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="label flex items-center gap-2"><Globe className="w-4 h-4 text-vnpt-accent" /> Link / Site</label>
                    <input value={editForm.linkSite} onChange={(e) => setEditForm({ ...editForm, linkSite: e.target.value })} className="input-field" placeholder="https://example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label flex items-center gap-2"><Building2 className="w-4 h-4 text-vnpt-accent" /> Đơn vị *</label>
                      <input value={editForm.donVi} onChange={(e) => setEditForm({ ...editForm, donVi: e.target.value })} className="input-field" required />
                    </div>
                    <div>
                      <label className="label">Danh mục</label>
                      <select value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })} className="input-field">
                        <option value="">Chọn danh mục</option>
                        {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label flex items-center gap-2"><Link2 className="w-4 h-4 text-vnpt-accent" /> Link chức năng</label>
                    <input value={editForm.linkChucNang} onChange={(e) => setEditForm({ ...editForm, linkChucNang: e.target.value })} className="input-field" placeholder="https://app.example.com/..." />
                  </div>
                  <div>
                    <label className="label flex items-center gap-2"><Activity className="w-4 h-4 text-vnpt-accent" /> Hiện trạng</label>
                    <textarea value={editForm.hienTrang} onChange={(e) => setEditForm({ ...editForm, hienTrang: e.target.value })} className="input-field" rows={3} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-2"><FileEdit className="w-4 h-4 text-vnpt-accent" /> Nội dung cần điều chỉnh *</label>
                    <textarea value={editForm.noiDungDieuChinh} onChange={(e) => setEditForm({ ...editForm, noiDungDieuChinh: e.target.value })} className="input-field" rows={4} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-2"><Workflow className="w-4 h-4 text-vnpt-accent" /> Quy trình thao tác</label>
                    <textarea value={editForm.quyTrinhThaoTac} onChange={(e) => setEditForm({ ...editForm, quyTrinhThaoTac: e.target.value })} className="input-field" rows={4} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Ưu tiên</label>
                      <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="input-field">
                        {Object.entries(PRIORITY_ALL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Hạn chót</label>
                      <input type="date" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} className="input-field" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {request.linkSite && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Link / Site</p>
                        <a href={request.linkSite} target="_blank" rel="noopener noreferrer" className="text-sm text-vnpt-blue hover:underline break-all">
                          {request.linkSite}
                        </a>
                      </div>
                    </div>
                  )}
                  {request.donVi && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Đơn vị</p>
                        <p className="text-sm text-gray-700">{request.donVi}</p>
                      </div>
                    </div>
                  )}
                  {request.linkChucNang && (
                    <div className="flex items-start gap-3">
                      <Link2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Link chức năng</p>
                        <a href={request.linkChucNang} target="_blank" rel="noopener noreferrer" className="text-sm text-vnpt-blue hover:underline break-all">
                          {request.linkChucNang}
                        </a>
                      </div>
                    </div>
                  )}
                  {request.hienTrang && (
                    <div className="flex items-start gap-3">
                      <Activity className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Hiện trạng</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.hienTrang}</p>
                      </div>
                    </div>
                  )}
                  {request.noiDungDieuChinh && (
                    <div className="flex items-start gap-3">
                      <FileEdit className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Nội dung cần điều chỉnh</p>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-1">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.noiDungDieuChinh}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {request.quyTrinhThaoTac && (
                    <div className="flex items-start gap-3">
                      <Workflow className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Quy trình thao tác</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-1">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.quyTrinhThaoTac}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!request.linkSite && !request.donVi && !request.linkChucNang && !request.hienTrang && !request.noiDungDieuChinh && !request.quyTrinhThaoTac && request.description && (
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                      {request.description}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* File Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-vnpt-darkblue mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                File đính kèm ({request.attachments.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {request.attachments.map((file: any) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {file.mimeType?.startsWith("image/") ? (
                      <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center">
                        <Image className="w-5 h-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                        <File className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.filename}</p>
                      <p className="text-xs text-gray-400">
                        {file.size < 1024 * 1024
                          ? `${(file.size / 1024).toFixed(1)} KB`
                          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments / History Tabs */}
          <div className="card">
            <div className="flex border-b mb-4">
              <button
                onClick={() => setActiveTab("comments")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "comments"
                    ? "border-vnpt-blue text-vnpt-blue"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Thảo luận ({request.comments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-vnpt-blue text-vnpt-blue"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <History className="w-4 h-4 inline mr-1" />
                Lịch sử ({request.auditLogs?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("flow")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "flow"
                    ? "border-vnpt-blue text-vnpt-blue"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <GitBranch className="w-4 h-4 inline mr-1" />
                Sơ đồ luồng
              </button>
            </div>

            {activeTab === "comments" && (
              <div>
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {request.comments?.length === 0 && (
                    <p className="text-center text-gray-400 py-4">Chưa có bình luận nào</p>
                  )}
                  {request.comments?.map((comment: any) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-lg ${
                        comment.isInternal ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-vnpt-lightblue flex items-center justify-center text-xs font-bold text-vnpt-blue">
                          {comment.user.name?.charAt(0) || "?"}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{comment.user.name}</span>
                        {comment.isInternal && (
                          <span className="badge bg-yellow-100 text-yellow-800 text-xs">Ghi chú nội bộ</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap ml-8">{comment.content}</p>
                    </div>
                  ))}
                </div>

                {canComment && (
                  <form onSubmit={handleComment} className="border-t pt-4">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="input-field mb-2"
                      rows={3}
                      placeholder="Nhập bình luận..."
                    />
                    <div className="flex items-center justify-between">
                      {role !== "requester" && (
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                            className="rounded"
                          />
                          Ghi chú nội bộ
                        </label>
                      )}
                      <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? "Đang gửi..." : "Gửi"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-3">
                {request.auditLogs?.map((log: any) => {
                  let details: any = {};
                  try { details = JSON.parse(log.details || "{}"); } catch {}
                  return (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-vnpt-accent mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-gray-700">
                          <span className="font-medium">{log.user.name}</span>{" "}
                          {log.action === "created" && "tạo yêu cầu mới"}
                          {log.action === "status_changed" && (
                            <>
                              chuyển trạng thái{" "}
                              <span className="font-medium text-vnpt-blue">
                                {STATUS_LABELS[details.oldStatus as keyof typeof STATUS_LABELS] || details.oldStatus}
                              </span>
                              {" → "}
                              <span className="font-medium text-green-600">
                                {STATUS_LABELS[details.newStatus as keyof typeof STATUS_LABELS] || details.newStatus}
                              </span>
                            </>
                          )}
                          {log.action === "updated" && "cập nhật thông tin"}
                          {log.action === "commented" && "bình luận"}
                        </p>
                        {details.transferReason && (
                          <p className="text-xs text-orange-600 mt-1 italic">
                            Lý do chuyển xử lý: {details.transferReason}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "flow" && (
              <FlowDiagram
                auditLogs={request.auditLogs || []}
                currentStatus={request.status}
                createdAt={request.createdAt}
                requesterName={request.requester?.name || ""}
                assigneeName={request.assignee?.name}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* ── Action Panel ── */}
          <div className="card">
            <h3 className="text-sm font-semibold text-vnpt-darkblue mb-3">Thao tác</h3>
            <div className="space-y-2">

              {/* ── Editing mode ── */}
              {editing && (
                <>
                  <button onClick={handleSaveEdit} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                    <CheckCircle className="w-4 h-4" /> Lưu thay đổi
                  </button>
                  <button onClick={() => { setEditing(false); fetchRequest(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                    <X className="w-4 h-4" /> Hủy chỉnh sửa
                  </button>
                </>
              )}

              {!editing && (
                <>
                  {/* ══════ AGENT / ADMIN ACTIONS ══════ */}
                  {role !== "requester" && (
                    <>
                      {/* ── Kho: Mới khởi tạo (chưa giao) ── */}
                      {status === "new" && !request.assigneeId && (
                        <button onClick={() => { setEditingAssignee(true); setShowTransferModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-vnpt-lightblue text-vnpt-blue hover:bg-vnpt-lightblue/80 transition-colors">
                          <ArrowRightLeft className="w-4 h-4" /> Chuyển xử lý
                        </button>
                      )}
                      {/* ── Kho: Đã chuyển xử lý ── */}
                      {status === "in_progress" && request.assigneeId && (
                        <>
                          {/* Only agent/admin can complete */}
                          {role !== "requester" && (
                            <>
                              <button onClick={() => handleStatusChange("waiting_response")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                                <RotateCcw className="w-4 h-4" /> Trả lại người tạo
                              </button>
                              <button onClick={() => handleStatusChange("resolved")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                                <CheckCircle className="w-4 h-4" /> Đánh dấu hoàn thành
                              </button>
                            </>
                          )}
                        </>
                      )}
                      {/* ── Kho: Chờ phản hồi ── */}
                      {status === "waiting_response" && role !== "requester" && (
                        <>
                          <button onClick={() => handleStatusChange("in_progress")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-vnpt-lightblue text-vnpt-blue hover:bg-vnpt-lightblue/80 transition-colors">
                            <RotateCcw className="w-4 h-4" /> Tiếp tục xử lý
                          </button>
                        </>
                      )}
                      {/* ── Kho: Đã hoàn thành ── */}
                      {status === "resolved" && (
                        <>
                          {role === "admin" && (
                            <button onClick={() => handleStatusChange("closed")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                              <Lock className="w-4 h-4" /> Khóa yêu cầu
                            </button>
                          )}
                          <button onClick={() => handleStatusChange("in_progress")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-vnpt-lightblue text-vnpt-blue hover:bg-vnpt-lightblue/80 transition-colors">
                            <RotateCcw className="w-4 h-4" /> Mở lại xử lý
                          </button>
                        </>
                      )}
                      {/* ── Kho: Bị trả lại ── */}
                      {status === "cancelled" && (
                        <>
                          <button onClick={() => { setEditingAssignee(true); setShowTransferModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-vnpt-lightblue text-vnpt-blue hover:bg-vnpt-lightblue/80 transition-colors">
                            <ArrowRightLeft className="w-4 h-4" /> Chuyển xử lý
                          </button>
                          <button onClick={() => setEditing(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                            <Pencil className="w-4 h-4" /> Sửa yêu cầu
                          </button>
                          <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" /> Xóa yêu cầu
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* ══════ REQUESTER ACTIONS ══════ */}
                  {isRequester && (
                    <>
                      {/* ── Kho: Mới khởi tạo (chưa giao) ── */}
                      {status === "new" && !request.assigneeId && (
                        <>
                          <button onClick={() => { setEditingAssignee(true); setShowTransferModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-vnpt-lightblue text-vnpt-blue hover:bg-vnpt-lightblue/80 transition-colors">
                            <ArrowRightLeft className="w-4 h-4" /> Chuyển xử lý
                          </button>
                          <button onClick={() => setEditing(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                            <Pencil className="w-4 h-4" /> Cập nhật thông tin
                          </button>
                          <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" /> Xóa yêu cầu
                          </button>
                        </>
                      )}
                      {/* ── Kho: Đã chuyển xử lý (in_progress) ── */}
                      {status === "in_progress" && request.assigneeId && (
                        <>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-vnpt-blue" />
                              <p className="text-xs font-medium text-vnpt-blue">Đang xử lý: {request.assignee?.name || "—"}</p>
                            </div>
                            <p className="text-xs text-blue-500">Bạn sẽ nhận thông báo khi có cập nhật</p>
                          </div>
                          <button onClick={() => handleStatusChange("cancelled")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                            <RotateCcw className="w-4 h-4" /> Yêu cầu xử lý lại
                          </button>
                        </>
                      )}
                      {/* ── Kho: Đã hoàn thành (resolved) → Xác nhận / Từ chối ── */}
                      {status === "resolved" && (
                        <>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-green-700">Chờ bạn xác nhận hoàn thành</p>
                            <p className="text-xs text-green-500 mt-1">Kiểm tra kết quả và xác nhận</p>
                          </div>
                          <button onClick={() => handleStatusChange("closed")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                            <ThumbsUp className="w-4 h-4" /> Xác nhận hoàn thành
                          </button>
                          <button onClick={() => setShowRejectModal(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                            <ThumbsDown className="w-4 h-4" /> Chưa hài lòng
                          </button>
                        </>
                      )}
                      {/* ── Kho: Bị trả lại ── */}
                      {status === "cancelled" && (
                        <>
                          <button onClick={() => { setEditingAssignee(true); setShowTransferModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-vnpt-lightblue text-vnpt-blue hover:bg-vnpt-lightblue/80 transition-colors">
                            <ArrowRightLeft className="w-4 h-4" /> Chuyển xử lý
                          </button>
                          <button onClick={() => setEditing(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                            <Pencil className="w-4 h-4" /> Sửa yêu cầu
                          </button>
                          <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" /> Xóa yêu cầu
                          </button>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="card">
            <h3 className="text-sm font-semibold text-vnpt-darkblue mb-3">Thông tin yêu cầu</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Ưu tiên</p>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={PRIORITY_BG_COLORS[request.priority as keyof typeof PRIORITY_BG_COLORS]}
                  >
                    {PRIORITY_LABELS[request.priority as keyof typeof PRIORITY_LABELS]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Người gửi</p>
                  <p className="text-sm text-gray-700">{request.requester.name || request.requester.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Người xử lý</p>
                  {request.assignments && request.assignments.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {request.assignments.map((assignment: any) => (
                        <span
                          key={assignment.user.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                            {assignment.user.name?.charAt(0) || "?"}
                          </div>
                          {assignment.user.name}
                        </span>
                      ))}
                    </div>
                  ) : request.assignee ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                        {request.assignee.name?.charAt(0) || "?"}
                      </div>
                      {request.assignee.name}
                    </span>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Chưa giao</p>
                  )}
                </div>
              </div>
              {request.category && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: request.category.color }} />
                  <div>
                    <p className="text-xs text-gray-500">Danh mục</p>
                    <p className="text-sm text-gray-700">{request.category.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Ngày tạo</p>
                  <p className="text-sm text-gray-700">{new Date(request.createdAt).toLocaleString("vi-VN")}</p>
                </div>
              </div>
              {request.deadline && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Hạn chót</p>
                    <p className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-700"}`}>
                      {new Date(request.deadline).toLocaleDateString("vi-VN")}
                      {isOverdue && " (Quá hạn)"}
                    </p>
                  </div>
                </div>
              )}
              {request.resolvedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">Ngày giải quyết</p>
                    <p className="text-sm text-gray-700">{new Date(request.resolvedAt).toLocaleString("vi-VN")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* ══ TRANSFER MODAL ══ */}
      {/* ══════════════════════════════════════════════ */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-vnpt-lightblue flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-vnpt-blue" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Chuyển xử lý</h2>
                  <p className="text-xs text-gray-500">Chọn người xử lý và nhập lý do</p>
                </div>
              </div>
              <button
                onClick={() => { setShowTransferModal(false); setTransferTo(""); setTransferReason(""); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Current assignee */}
              {request.assignee && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Người xử lý hiện tại</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-vnpt-lightblue flex items-center justify-center text-xs font-bold text-vnpt-blue">
                      {request.assignee.name?.charAt(0) || "?"}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{request.assignee.name}</span>
                  </div>
                </div>
              )}

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-vnpt-lightblue flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4 text-vnpt-blue" />
                </div>
              </div>

              {/* New assignees - Multi-select */}
              <div>
                <label className="label text-sm font-medium text-gray-700">
                  Chọn người xử lý <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-400 font-normal ml-1">(Có thể chọn nhiều người)</span>
                </label>
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {availableAgents.map((user: any) => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0 ${
                        transferToIds.includes(user.id) ? "bg-blue-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={transferToIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTransferToIds([...transferToIds, user.id]);
                          } else {
                            setTransferToIds(transferToIds.filter(id => id !== user.id));
                          }
                        }}
                        className="w-4 h-4 text-vnpt-blue border-gray-300 rounded focus:ring-vnpt-blue"
                      />
                      <div className="w-8 h-8 rounded-full bg-vnpt-lightblue flex items-center justify-center text-xs font-bold text-vnpt-blue">
                        {user.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role === "admin" ? "Admin" : "Agent"}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {transferToIds.length > 0 && (
                  <p className="text-xs text-vnpt-blue mt-2">
                    Đã chọn {transferToIds.length} người xử lý
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="label text-sm font-medium text-gray-700">
                  Lý do chuyển xử lý
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Nhập lý do chuyển xử lý (ví dụ: Chuyên môn phù hợp hơn, bận xử lý yêu cầu khác...)"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowTransferModal(false); setTransferTo(""); setTransferToIds([]); setTransferReason(""); }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferToIds.length === 0 || transferring}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-vnpt-blue hover:bg-vnpt-darkblue transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {transferring ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang chuyển...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    Chuyển xử lý
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ══ REJECT MODAL ══ */}
      {/* ══════════════════════════════════════════════ */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <ThumbsDown className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Yêu cầu xử lý lại</h2>
                  <p className="text-xs text-gray-500">Phản hồi về kết quả xử lý</p>
                </div>
              </div>
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  Yêu cầu sẽ được chuyển trạng thái về <strong>"Đang xử lý"</strong> và người xử lý sẽ nhận được thông báo kiểm tra lại.
                </p>
              </div>

              <div>
                <label className="label text-sm font-medium text-gray-700">
                  Lý do yêu cầu xử lý lại
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Mô tả lý do chưa hài lòng với kết quả xử lý (ví dụ: Chưa xử lý đúng yêu cầu, cần bổ sung thêm...)"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <ThumbsDown className="w-4 h-4" />
                Yêu cầu xử lý lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
