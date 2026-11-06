"use client";

import {
  FileText,
  UserCheck,
  CheckCircle,
  Lock,
  RotateCcw,
  Clock,
  MessageSquare,
  ArrowRight,
  ArrowDown,
  User,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { STATUS_LABELS } from "@/lib/types";

interface AuditLog {
  id: string;
  action: string;
  createdAt: string;
  user: { name: string; email: string };
  details?: string;
}

interface FlowDiagramProps {
  auditLogs: AuditLog[];
  currentStatus: string;
  createdAt: string;
  requesterName: string;
  assigneeName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
  new: { label: "Mới khởi tạo", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-300", icon: FileText },
  in_progress: { label: "Đang xử lý", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-300", icon: UserCheck },
  waiting_response: { label: "Chờ phản hồi", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-300", icon: Clock },
  resolved: { label: "Đã giải quyết", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-300", icon: CheckCircle },
  closed: { label: "Đã đóng", color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-300", icon: Lock },
  cancelled: { label: "Bị trả lại", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-300", icon: RotateCcw },
};

const ACTION_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  created: { label: "Tạo yêu cầu", color: "text-blue-600", bgColor: "bg-blue-100", icon: FileText },
  status_changed: { label: "Thay đổi trạng thái", color: "text-vnpt-blue", bgColor: "bg-vnpt-lightblue", icon: ArrowRight },
  updated: { label: "Cập nhật thông tin", color: "text-gray-600", bgColor: "bg-gray-100", icon: Pencil },
  commented: { label: "Bình luận", color: "text-purple-600", bgColor: "bg-purple-100", icon: MessageSquare },
  assigned: { label: "Giao việc", color: "text-amber-600", bgColor: "bg-amber-100", icon: UserCheck },
  deleted: { label: "Xóa", color: "text-red-600", bgColor: "bg-red-100", icon: Trash2 },
};

export default function FlowDiagram({
  auditLogs,
  currentStatus,
  createdAt,
  requesterName,
  assigneeName,
}: FlowDiagramProps) {
  // Parse audit logs and build flow steps
  const flowSteps = auditLogs.map((log) => {
    let details: any = {};
    try { details = JSON.parse(log.details || "{}"); } catch {}
    
    return {
      id: log.id,
      action: log.action,
      timestamp: log.createdAt,
      userName: log.user.name,
      details,
      statusFrom: details.oldStatus,
      statusTo: details.newStatus,
    };
  });

  // Reverse to show chronological order (oldest first)
  const sortedSteps = [...flowSteps].reverse();

  // Get current status config
  const currentConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.new;

  return (
    <div className="space-y-4">
      {/* Current Status Banner */}
      <div className={`rounded-xl border-2 ${currentConfig.borderColor} ${currentConfig.bgColor} p-4`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${currentConfig.bgColor}`}>
            <currentConfig.icon className={`w-6 h-6 ${currentConfig.color}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Trạng thái hiện tại</p>
            <p className={`text-lg font-bold ${currentConfig.color}`}>{currentConfig.label}</p>
          </div>
        </div>
      </div>

      {/* Flow Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Steps */}
        <div className="space-y-1">
          {/* Step 1: Created */}
          <div className="relative flex items-start gap-4 pl-2">
            <div className="relative z-10 w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 pb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Tạo yêu cầu
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{requesterName}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Yêu cầu mới được khởi tạo</p>
              </div>
            </div>
          </div>

          {/* Other steps from audit logs */}
          {sortedSteps
            .filter((step) => step.action !== "created")
            .map((step, index) => {
              const actionConfig = ACTION_CONFIG[step.action] || ACTION_CONFIG.updated;
              const Icon = actionConfig.icon;

              return (
                <div key={step.id} className="relative flex items-start gap-4 pl-2">
                  {/* Node */}
                  <div className="relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center"
                    style={{
                      backgroundColor: step.action === "status_changed" ? "#E8F4FD" : 
                                       step.action === "commented" ? "#F3E8FF" : "#F3F4F6",
                      borderColor: step.action === "status_changed" ? "#0066B3" : 
                                   step.action === "commented" ? "#A855F7" : "#D1D5DB",
                    }}
                  >
                    <Icon className={`w-5 h-5 ${actionConfig.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${actionConfig.bgColor} ${actionConfig.color}`}>
                            {actionConfig.label}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{step.userName}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(step.timestamp).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      {/* Status Change */}
                      {step.action === "status_changed" && step.statusFrom && step.statusTo && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {STATUS_LABELS[step.statusFrom as keyof typeof STATUS_LABELS] || step.statusFrom}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                            {STATUS_LABELS[step.statusTo as keyof typeof STATUS_LABELS] || step.statusTo}
                          </span>
                        </div>
                      )}

                      {/* Transfer Reason */}
                      {step.details.transferReason && (
                        <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
                          <p className="text-xs text-orange-700">
                            <span className="font-medium">Lý do:</span> {step.details.transferReason}
                          </p>
                        </div>
                      )}

                      {/* Comment */}
                      {step.action === "commented" && step.details.content && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{step.details.content}"</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Final Status */}
          <div className="relative flex items-start gap-4 pl-2">
            <div className={`relative z-10 w-10 h-10 rounded-full ${currentConfig.bgColor} border-2 ${currentConfig.borderColor} flex items-center justify-center`}>
              <currentConfig.icon className={`w-5 h-5 ${currentConfig.color}`} />
            </div>
            <div className="flex-1">
              <div className={`border-2 ${currentConfig.borderColor} ${currentConfig.bgColor} rounded-xl p-4`}>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${currentConfig.bgColor} ${currentConfig.color}`}>
                    {currentConfig.label}
                  </span>
                  <span className="text-xs text-gray-400">• Hiện tại</span>
                </div>
                {currentStatus === "in_progress" && assigneeName && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Người xử lý:</span> {assigneeName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tóm tắt quá trình xử lý</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Tổng số bước</p>
            <p className="font-bold text-gray-900">{sortedSteps.length + 1}</p>
          </div>
          <div>
            <p className="text-gray-500">Số lần thay đổi trạng thái</p>
            <p className="font-bold text-gray-900">
              {sortedSteps.filter((s) => s.action === "status_changed").length}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Số bình luận</p>
            <p className="font-bold text-gray-900">
              {sortedSteps.filter((s) => s.action === "commented").length}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Thời gian xử lý</p>
            <p className="font-bold text-gray-900">
              {(() => {
                const diff = new Date().getTime() - new Date(createdAt).getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const days = Math.floor(hours / 24);
                if (days > 0) return `${days} ngày`;
                return `${hours} giờ`;
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
