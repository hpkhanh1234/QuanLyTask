export type UserRole = "requester" | "agent" | "admin";

export type RequestStatus =
  | "new"
  | "in_progress"
  | "waiting_response"
  | "resolved"
  | "closed"
  | "cancelled";

export type RequestPriority = "low" | "medium" | "high" | "urgent";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Mới tạo",
  in_progress: "Đang xử lý",
  waiting_response: "Chờ phản hồi",
  resolved: "Đã giải quyết",
  closed: "Đã đóng",
  cancelled: "Đã hủy",
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  waiting_response: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export const STATUS_BG_COLORS: Record<RequestStatus, React.CSSProperties> = {
  new: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  in_progress: { backgroundColor: '#FEF3C7', color: '#92400E' },
  waiting_response: { backgroundColor: '#EDE9FE', color: '#5B21B6' },
  resolved: { backgroundColor: '#D1FAE5', color: '#065F46' },
  closed: { backgroundColor: '#F3F4F6', color: '#374151' },
  cancelled: { backgroundColor: '#FEE2E2', color: '#991B1B' },
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Gấp",
};

export const PRIORITY_COLORS: Record<RequestPriority, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export const PRIORITY_BG_COLORS: Record<RequestPriority, React.CSSProperties> = {
  low: { backgroundColor: '#F3F4F6', color: '#374151' },
  medium: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  high: { backgroundColor: '#FFEDD5', color: '#9A3412' },
  urgent: { backgroundColor: '#FEE2E2', color: '#991B1B' },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  requester: "Người gửi",
  agent: "Người xử lý",
  admin: "Quản trị viên",
};

export const STATUS_FLOW: Record<RequestStatus, RequestStatus[]> = {
  new: ["in_progress", "cancelled"],
  in_progress: ["waiting_response", "resolved", "cancelled"],
  waiting_response: ["in_progress", "resolved", "cancelled"],
  resolved: ["closed", "in_progress"],
  closed: [],
  cancelled: ["new"],
};
