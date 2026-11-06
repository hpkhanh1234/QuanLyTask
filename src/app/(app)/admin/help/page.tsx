"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HelpCircle, Users, FolderOpen, Tag, Settings,
  ChevronDown, ChevronRight, FileText, BarChart3,
  Shield, Workflow, CheckCircle, AlertCircle,
} from "lucide-react";


interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: HelpItem[];
}

interface HelpItem {
  title: string;
  content: string;
}

const helpSections: HelpSection[] = [
  {
    id: "overview",
    title: "Tổng quan hệ thống",
    icon: <HelpCircle className="w-5 h-5" />,
    color: "bg-blue-50 border-blue-200 text-blue-800",
    items: [
      {
        title: "Giới thiệu",
        content: "Hệ thống Quản lý Yêu cầu giúp theo dõi và xử lý các yêu cầu hỗ trợ trong tổ chức. Hỗ trợ 3 vai trò: Người gửi (Requester), Người xử lý (Agent), và Quản trị viên (Admin).",
      },
      {
        title: "Đăng nhập",
        content: "Sử dụng email và mật khẩu đã được cấp để đăng nhập. Mỗi người dùng sẽ thấy giao diện phù hợp với vai trò của mình.",
      },
      {
        title: "Dashboard (Tổng quan)",
        content: "Trang chính hiển thị thống kê tổng quát:\n• Tổng số yêu cầu\n• Đang xử lý, Đã hoàn thành\n• Tỷ lệ SLA\n• Biểu đồ theo trạng thái, ưu tiên, danh mục\n• Nhấn vào ô số lượng để xem danh sách chi tiết",
      },
    ],
  },
  {
    id: "users",
    title: "Quản lý người dùng",
    icon: <Users className="w-5 h-5" />,
    color: "bg-green-50 border-green-200 text-green-800",
    items: [
      {
        title: "Thêm người dùng mới",
        content: "1. Nhấn nút \"Thêm người dùng\"\n2. Nhập Họ tên, Email, Mật khẩu\n3. Chọn vai trò: Admin / Agent / Requester\n4. Nhập Phòng ban (tùy chọn)\n5. Nhấn \"Tạo\"",
      },
      {
        title: "Phân quyền vai trò",
        content: "• Admin: Toàn quyền quản lý hệ thống\n• Agent: Xử lý yêu cầu, chuyển xử lý, bình luận\n• Requester: Tạo yêu cầu, theo dõi, xác nhận hoàn thành",
      },
      {
        title: "Sửa / Xóa người dùng",
        content: "• Hover vào dòng → nhấn ✏️ để sửa\n• Nhấn 🗑️ để xóa (soft delete)\n• Kích hoạt/Vô hiệu hóa bằng cách toggle trạng thái\n• Không thể xóa chính mình hoặc Admin cuối cùng",
      },
      {
        title: "Lọc và tìm kiếm",
        content: "• Tìm kiếm theo tên hoặc email\n• Lọc theo vai trò (Admin/Agent/Requester)\n• Hiển thị/ẩn tài khoản đã vô hiệu hóa",
      },
    ],
  },
  {
    id: "categories",
    title: "Quản lý danh mục",
    icon: <FolderOpen className="w-5 h-5" />,
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    items: [
      {
        title: "Thêm danh mục mới",
        content: "1. Nhấn nút \"Thêm danh mục\"\n2. Nhập Tên danh mục\n3. Nhập Mô tả (tùy chọn)\n4. Chọn màu sắc từ 10 màu preset hoặc chọn tùy chỉnh\n5. Nhấn \"Tạo\"",
      },
      {
        title: "Sửa / Xóa danh mục",
        content: "• Hover vào card → nhấn ✏️ để sửa tên/màu\n• Nhấn 🗑️ để xóa\n• Nếu danh mục có yêu cầu → soft delete (ẩn)\n• Nếu chưa có yêu cầu → xóa vĩnh viễn",
      },
      {
        title: "Ý nghĩa màu sắc",
        content: "Màu danh mục hiển thị dưới dạng badge trên:\n• Danh sách yêu cầu\n• Chi tiết yêu cầu\n• Dashboard thống kê",
      },
    ],
  },
  {
    id: "priorities",
    title: "Mức độ ưu tiên",
    icon: <Tag className="w-5 h-5" />,
    color: "bg-purple-50 border-purple-200 text-purple-800",
    items: [
      {
        title: "Thêm mức ưu tiên mới",
        content: "1. Nhấn nút \"Thêm\"\n2. Nhập Key (mã): low, medium, high, urgent...\n3. Nhập Label (hiển thị): Thấp, Trung bình, Cao, Gấp...\n4. Chọn màu nền và màu chữ\n5. Nhấn \"Tạo\"",
      },
      {
        title: "Sắp xếp thứ tự",
        content: "• Sử dụng nút mũi tên ↑↓ để đổi thứ tự\n• Thứ tự hiển thị trong:\n  - Form tạo yêu cầu\n  - Danh sách yêu cầu\n  - Dashboard thống kê",
      },
      {
        title: "Lưu ý",
        content: "• Key phải là duy nhất (không trùng)\n• Không nên xóa mức ưu tiên đang được sử dụng\n• Màu sắc sẽ hiển thị trên badge ở mọi nơi",
      },
    ],
  },
  {
    id: "requests",
    title: "Quản lý yêu cầu",
    icon: <FileText className="w-5 h-5" />,
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
    items: [
      {
        title: "Tạo yêu cầu mới",
        content: "1. Nhấn \"Tạo yêu cầu\" trong menu\n2. Điền thông tin:\n   - Link/Site: Đường dẫn trang web liên quan\n   - Đơn vị: Bộ phận hoặc phòng ban\n   - Link chức năng: Chức năng cụ thể cần xử lý\n   - Hiện trạng: Tình trạng hiện tại\n   - Nội dung cần điều chỉnh: Mô tả chi tiết\n   - Quy trình thao tác: Các bước thực hiện\n   - Mức độ ưu tiên\n   - Người được assign (tùy chọn)\n3. Đính kèm file (hình ảnh, tài liệu) nếu cần\n4. Nhấn \"Tạo yêu cầu\"",
      },
      {
        title: "Các kho yêu cầu",
        content: "• Tất cả: Mọi yêu cầu liên quan đến bạn\n• Mới khởi tạo: Yêu cầu chưa chuyển xử lý\n• Đã chuyển xử lý: Đã gán người xử lý\n• Được giao xử lý: Yêu cầu được giao cho bạn\n• Đã hoàn thành: Yêu cầu đã xử lý xong\n• Bị trả lại: Yêu cầu bị trả về để cập nhật",
      },
      {
        title: "Thao tác theo vai trò",
        content: "Requester:\n• Mới tạo: Chuyển xử lý, Sửa, Xóa\n• Đang xử lý: Chuyển xử lý, Yêu cầu xử lý lại\n• Đã hoàn thành: Xác nhận hoặc Từ chối\n• Bị trả lại: Chuyển xử lý, Sửa, Xóa\n\nAgent/Admin:\n• Chuyển xử lý, Trả lại người tạo\n• Đánh dấu hoàn thành\n• Bình luận và ghi chú nội bộ",
      },
      {
        title: "Bình luận và ghi chú",
        content: "• Bình luận công khai: Tất cả đều thấy\n• Ghi chú nội bộ: Chỉ Agent/Admin thấy\n• Khi thay đổi trạng thái → tự động tạo bình luận",
      },
    ],
  },
  {
    id: "workflow",
    title: "Quy trình xử lý",
    icon: <Workflow className="w-5 h-5" />,
    color: "bg-cyan-50 border-cyan-200 text-cyan-800",
    items: [
      {
        title: "Luồng trạng thái",
        content: "🆕 Mới tạo → 🔄 Đang xử lý → ✅ Đã giải quyết → 🔒 Đã đóng\n\nHoặc:\n🔄 Đang xử lý → ⏳ Chờ phản hồi → 🔄 Đang xử lý\n✅ Đã giải quyết → 🔄 Đang xử lý (xử lý lại)\n❌ Đã hủy → 🆕 Mới tạo (khôi phục)",
      },
      {
        title: "Chuyển xử lý",
        content: "1. Nhấn nút \"Chuyển xử lý\"\n2. Chọn người xử lý mới từ danh sách\n3. Nhập lý do (tùy chọn)\n4. Xác nhận\n→ Người mới nhận thông báo\n→ Lịch sử được ghi lại",
      },
      {
        title: "Trả lại người tạo",
        content: "Dùng khi cần người tạo cập nhật nội dung:\n1. Nhấn \"Trả lại người tạo\"\n2. Nhập lý do trả lại\n3. Xác nhận\n→ Yêu cầu chuyển sang trạng thái \"Chờ phản hồi\"\n→ Người tạo nhận thông báo",
      },
      {
        title: "Xác nhận hoàn thành",
        content: "Khi Agent đánh dấu \"Đã giải quyết\":\n1. Requester thấy thông báo xác nhận\n2. Requester chọn:\n   - \"Xác nhận\" → Đóng yêu cầu\n   - \"Chưa hài lòng\" → Yêu cầu xử lý lại + nhập lý do",
      },
    ],
  },
  {
    id: "reports",
    title: "Báo cáo & Thống kê",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "bg-orange-50 border-orange-200 text-orange-800",
    items: [
      {
        title: "Dashboard tổng quan",
        content: "Hiển thị:\n• Tổng số yêu cầu theo trạng thái\n• Thống kê theo mức ưu tiên\n• Biểu đồ danh mục\n• Tỷ lệ SLA\n• Thời gian xử lý trung bình",
      },
      {
        title: "Xem chi tiết từ Dashboard",
        content: "• Nhấn vào ô \"Tổng yêu cầu\" → Danh sách tất cả\n• Nhấn vào ô \"Đang xử lý\" → Danh sách đang xử lý\n• Nhấn vào ô \"Đã hoàn thành\" → Danh sách đã xong\n• Nhấn vào ô \"Quá hạn\" → Danh sách quá hạn",
      },
      {
        title: "Xuất dữ liệu",
        content: "Tại trang \"Báo cáo\":\n• Nhấn \"Xuất Excel\" → Tải file .xlsx\n• Nhấn \"Xuất CSV\" → Tải file .csv\n• Chọn khoảng thời gian trước khi xuất",
      },
    ],
  },
  {
    id: "notifications",
    title: "Thông báo",
    icon: <AlertCircle className="w-5 h-5" />,
    color: "bg-pink-50 border-pink-200 text-pink-800",
    items: [
      {
        title: "Loại thông báo",
        content: "• Được giao xử lý yêu cầu mới\n• Có bình luận mới trên yêu cầu\n• Trạng thái yêu cầu thay đổi\n• Yêu cầu quá hạn xử lý\n• Yêu cầu bị trả lại",
      },
      {
        title: "Quản lý thông báo",
        content: "• Nhấn 🔔 trên header để xem thông báo mới\n• Nhấn vào thông báo → Chuyển đến chi tiết yêu cầu\n• Đánh dấu đã đọc bằng cách nhấn vào thông báo",
      },
    ],
  },
  {
    id: "rbac",
    title: "Phân quyền chi tiết",
    icon: <Shield className="w-5 h-5" />,
    color: "bg-red-50 border-red-200 text-red-800",
    items: [
      {
        title: "Admin (Quản trị viên)",
        content: "• Quản lý người dùng (CRUD)\n• Quản lý danh mục (CRUD)\n• Quản lý mức độ ưu tiên (CRUD)\n• Xem tất cả yêu cầu\n• Xem tất cả báo cáo\n• Khóa / Mở yêu cầu\n• Cài đặt hệ thống",
      },
      {
        title: "Agent (Người xử lý)",
        content: "• Xem yêu cầu được giao\n• Xem yêu cầu mình tạo\n• Chuyển xử lý cho người khác\n• Trả lại người tạo\n• Đánh dấu hoàn thành\n• Bình luận và ghi chú nội bộ\n• Không quản lý người dùng/danh mục",
      },
      {
        title: "Requester (Người gửi)",
        content: "• Tạo yêu cầu mới\n• Xem yêu cầu của mình\n• Sửa / Xóa yêu cầu mới tạo\n• Chuyển xử lý (gán Agent)\n• Xác nhận / Từ chối hoàn thành\n• Không xem yêu cầu của người khác\n• Không quản lý hệ thống",
      },
    ],
  },
];

export default function AdminHelpPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    if (role !== "admin") {
      router.push("/dashboard");
    }
  }, [role]);

  if (role !== "admin") return null;

  function toggleSection(id: string) {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleItem(id: string) {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vnpt-darkblue">Hướng dẫn sử dụng hệ thống</h1>
        <p className="text-gray-600 mt-1">Tài liệu hướng dẫn tất cả các chức năng trong hệ thống</p>
      </div>

      {/* Quick Navigation */}
      <div className="card">
        <h3 className="text-sm font-semibold text-vnpt-darkblue mb-3">🔗 Mục lục nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {helpSections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                toggleSection(section.id);
                if (!expandedSections.includes(section.id)) {
                  setExpandedSections((prev) => [...prev, section.id]);
                }
                document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-vnpt-lightblue text-left text-sm transition-colors"
            >
              <span className="text-vnpt-blue">{section.icon}</span>
              <span className="text-vnpt-darkblue font-medium">{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Help Sections */}
      {helpSections.map((section) => (
        <div
          key={section.id}
          id={`section-${section.id}`}
          className={`rounded-xl border-2 transition-all ${
            expandedSections.includes(section.id) ? section.color : "bg-white border-gray-200"
          }`}
        >
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className={expandedSections.includes(section.id) ? "text-current" : "text-vnpt-blue"}>
                {section.icon}
              </span>
              <h3 className="text-lg font-semibold">{section.title}</h3>
            </div>
            {expandedSections.includes(section.id) ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          {expandedSections.includes(section.id) && (
            <div className="px-4 pb-4 space-y-2">
              {section.items.map((item, idx) => {
                const itemId = `${section.id}-${idx}`;
                const isExpanded = expandedItems.includes(itemId);
                return (
                  <div key={idx} className="bg-white/80 rounded-lg border border-current/10">
                    <button
                      onClick={() => toggleItem(itemId)}
                      className="w-full flex items-center justify-between p-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-vnpt-green" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                          {item.content}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Contact Info */}
      <div className="card bg-vnpt-lightblue border border-vnpt-blue/20">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-6 h-6 text-vnpt-blue mt-1" />
          <div>
            <h3 className="font-semibold text-vnpt-darkblue">Cần hỗ trợ thêm?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Liên hệ quản trị viên hệ thống để được hỗ trợ. 
              Email: admin@company.com | SĐT: 0123.456.789
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
