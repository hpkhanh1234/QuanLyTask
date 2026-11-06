import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.request.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 12);

  // Create users
  const admin = await prisma.user.create({
    data: {
      name: "Admin Nguyễn",
      email: "admin@demo.com",
      password,
      role: "admin",
      department: "IT",
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      name: "Trần Minh Agent",
      email: "agent@demo.com",
      password,
      role: "agent",
      department: "Hỗ trợ kỹ thuật",
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      name: "Lê Thị Agent",
      email: "agent2@demo.com",
      password,
      role: "agent",
      department: "IT",
    },
  });

  const requester1 = await prisma.user.create({
    data: {
      name: "Phạm Văn User",
      email: "requester@demo.com",
      password,
      role: "requester",
      department: "Marketing",
    },
  });

  const requester2 = await prisma.user.create({
    data: {
      name: "Hoàng Thị User",
      email: "user2@demo.com",
      password,
      role: "requester",
      department: "Nhân sự",
    },
  });

  console.log("✅ Created users");

  // Create categories
  const catIT = await prisma.category.create({
    data: { name: "Hỗ trợ IT", description: "Vấn đề về máy tính, phần mềm", color: "#3b82f6" },
  });

  const catHR = await prisma.category.create({
    data: { name: "Nhân sự", description: "Chính sách, phúc lợi", color: "#22c55e" },
  });

  const catFacility = await prisma.category.create({
    data: { name: "Cơ sở vật chất", description: "Văn phòng, thiết bị", color: "#f59e0b" },
  });

  const catFinance = await prisma.category.create({
    data: { name: "Tài chính", description: "Chi phí, thanh toán", color: "#8b5cf6" },
  });

  const catGeneral = await prisma.category.create({
    data: { name: "Yêu cầu chung", description: "Các yêu cầu khác", color: "#6b7280" },
  });

  console.log("✅ Created categories");

  // Create requests with domain-specific fields
  const requests = [
    {
      title: "Điều chỉnh form đăng nhập hệ thống CRM",
      description: "Yêu cầu điều chỉnh giao diện và luồng đăng nhập",
      status: "in_progress",
      priority: "high",
      requesterId: requester1.id,
      assigneeId: agent1.id,
      categoryId: catIT.id,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      linkSite: "https://crm.company.com",
      donVi: "Phòng Kinh doanh",
      linkChucNang: "https://crm.company.com/login",
      hienTrang: "Form đăng nhập hiện tại không hỗ trợ SSO, giao diện cũ cần cập nhật theo design system mới.",
      noiDungDieuChinh: "1. Thêm nút \"Đăng nhập bằng Google\"\n2. Thay đổi layout form sang dạng card centered\n3. Thêm captcha cho lần đăng nhập sai > 3 lần",
      quyTrinhThaoTac: "Bước 1: Truy cập trang CRM\nBước 2: Nhập email + mật khẩu\nBước 3: Xác thực OTP (nếu bật 2FA)\nBước 4: Đăng nhập thành công",
    },
    {
      title: "Cấp quyền truy cập hệ thống HRM cho nhân viên mới",
      description: "Nhân viên mới cần được cấp tài khoản",
      status: "new",
      priority: "medium",
      requesterId: requester2.id,
      assigneeId: agent2.id,
      categoryId: catIT.id,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      linkSite: "https://hrm.company.com",
      donVi: "Phòng Nhân sự",
      linkChucNang: "https://hrm.company.com/admin/users",
      hienTrang: "Nhân viên mới Nguyễn Văn B (Mã NV: NV2024001) chưa có tài khoản truy cập hệ thống.",
      noiDungDieuChinh: "Tạo tài khoản mới với quyền \"Nhân viên\" cho Nguyễn Văn B, email: nguyenvanb@company.com",
      quyTrinhThaoTac: "Bước 1: Đăng nhập HRM với tài khoản Admin\nBước 2: Vào Quản lý người dùng > Thêm mới\nBước 3: Nhập thông tin nhân viên\nBước 4: Gán quyền và phòng ban\nBước 5: Gửi email kích hoạt",
    },
    {
      title: "Điều chỉnh quy trình phê duyệt đơn hàng mua sắm",
      description: "Thay đổi luồng phê duyệt theo chính sách mới",
      status: "waiting_response",
      priority: "urgent",
      requesterId: requester1.id,
      assigneeId: agent1.id,
      categoryId: catFinance.id,
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      linkSite: "https://procurement.company.com",
      donVi: "Bộ phận Mua hàng",
      linkChucNang: "https://procurement.company.com/approval",
      hienTrang: "Quy trình hiện tại: Đơn hàng > Trưởng bộ phận > Kế toán. Cần thêm bước Giám đốc duyệt cho đơn > 50 triệu.",
      noiDungDieuChinh: "Thêm bước \"Giám đốc phê duyệt\" cho đơn hàng có giá trị > 50,000,000 VNĐ. Tự động chuyển sang bước tiếp theo sau khi phê duyệt.",
      quyTrinhThaoTac: "Bước 1: Tạo đơn hàng mua sắm\nBước 2: Trưởng bộ phận phê duyệt\nBước 3: [MỚI] Giám đốc phê duyệt (nếu > 50 triệu)\nBước 4: Kế toán xác nhận\nBước 5: Đặt hàng",
    },
    {
      title: "Cập nhật giao diện bảng điều khiển Dashboard",
      description: "Redesign dashboard theo design system mới",
      status: "resolved",
      priority: "medium",
      requesterId: requester2.id,
      assigneeId: null,
      categoryId: catIT.id,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      linkSite: "https://app.company.com/dashboard",
      donVi: "Phòng IT",
      linkChucNang: "https://app.company.com/dashboard",
      hienTrang: "Dashboard hiện tại sử dụng design system cũ, màu sắc không đồng bộ,缺少 responsive design trên mobile.",
      noiDungDieuChinh: "1. Áp dụng design system mới (Figma link)\n2. Responsive cho tablet và mobile\n3. Thêm dark mode\n4. Cải thiện hiệu suất render biểu đồ",
      quyTrinhThaoTac: "Bước 1: Pull code mới nhất\nBước 2: Cập nhật component library\nBước 3: Thay thế old components\nBước 4: Test responsive\nBước 5: Deploy lên staging",
    },
    {
      title: "Sửa lỗi thanh toán trực tuyến",
      description: "Lỗi hệ thống thanh toán không ghi nhận giao dịch",
      status: "closed",
      priority: "high",
      requesterId: requester1.id,
      assigneeId: agent2.id,
      categoryId: catFinance.id,
      deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      linkSite: "https://payment.company.com",
      donVi: "Phòng Kế toán",
      linkChucNang: "https://payment.company.com/checkout",
      hienTrang: "Khoảng 5% đơn hàng thanh toán online không được ghi nhận vào hệ thống, gây mất dữ liệu.",
      noiDungDieuChinh: "Sửa lỗi webhook callback từ cổng thanh toán VNPay, đảm bảo mọi giao dịch thành công đều được ghi nhận.",
      quyTrinhThaoTac: "Bước 1: Kiểm tra logs webhook\nBước 2: Xác định nguyên nhân timeout\nBước 3: Sửa lại retry mechanism\nBước 4: Deploy hotfix\nBước 5: Monitor 24h",
    },
    {
      title: "Thêm module báo cáo doanh thu theo chi nhánh",
      description: "Yêu cầu tính năng mới cho hệ thống báo cáo",
      status: "new",
      priority: "medium",
      requesterId: requester2.id,
      assigneeId: null,
      categoryId: catFinance.id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      linkSite: "https://report.company.com",
      donVi: "Ban Giám đốc",
      linkChucNang: "https://report.company.com/revenue",
      hienTrang: "Hiện tại hệ thống chỉ có báo cáo doanh thu tổng hợp toàn công ty, không phân theo chi nhánh.",
      noiDungDieuChinh: "Thêm bộ lọc \"Chi nhánh\" vào trang báo cáo doanh thu. Hiển thị biểu đồ so sánh giữa các chi nhánh. Xuất Excel phân theo chi nhánh.",
      quyTrinhThaoTac: "Bước 1: Truy cập Báo cáo > Doanh thu\nBước 2: Chọn khoảng thời gian\nBước 3: [MỚI] Chọn chi nhánh\nBước 4: Xem biểu đồ và bảng số liệu\nBước 5: Xuất báo cáo",
    },
    {
      title: "Nâng cấp hệ thống xác thực 2FA",
      description: "Áp dụng xác thực hai yếu tố cho toàn bộ hệ thống",
      status: "in_progress",
      priority: "urgent",
      requesterId: requester1.id,
      assigneeId: agent1.id,
      categoryId: catIT.id,
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      linkSite: "https://auth.company.com",
      donVi: "Phòng IT An ninh",
      linkChucNang: "https://auth.company.com/settings/2fa",
      hienTrang: "Hệ thống hiện chỉ dùng xác thực 1 lớp (email + password). Chưa có 2FA, dễ bị tấn công brute-force.",
      noiDungDieuChinh: "1. Hỗ trợ TOTP (Google Authenticator)\n2. Hỗ trợ SMS OTP dự phòng\n3. Buộc bật 2FA cho tài khoản Admin\n4. Thêm trang cài đặt 2FA cho user",
      quyTrinhThaoTac: "Bước 1: Đăng nhập hệ thống\nBước 2: Vào Cài đặt > Bảo mật\nBước 3: Bật 2FA\nBước 4: Quét QR code bằng Authenticator app\nBước 5: Nhập mã xác nhận\nBước 6: Lưu mã khôi phục",
    },
    {
      title: "Thay đổi layout trang chủ theo yêu cầu Marketing",
      description: "Điều chỉnh giao diện trang chủlanding page",
      status: "cancelled",
      priority: "low",
      requesterId: requester2.id,
      assigneeId: agent2.id,
      categoryId: catGeneral.id,
      linkSite: "https://www.company.com",
      donVi: "Phòng Marketing",
      linkChucNang: "https://www.company.com/home",
      hienTrang: "Landing page hiện tại có tỷ lệ chuyển đổi thấp (1.2%).",
      noiDungDieuChinh: "Yêu cầu bị hủy vì Marketing quyết định sử dụng Landing Page Builder bên thứ 3 thay vì sửa code.",
    },
    {
      title: "Điều chỉnh luồng phê duyệt nghỉ phép",
      description: "Thay đổi quy trình phê duyệt đơn xin nghỉ phép",
      status: "new",
      priority: "low",
      requesterId: requester1.id,
      assigneeId: agent2.id,
      categoryId: catHR.id,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      linkSite: "https://hrm.company.com",
      donVi: "Phòng Nhân sự",
      linkChucNang: "https://hrm.company.com/leave/request",
      hienTrang: "Quy trình hiện tại: Nhân viên nộp đơn > Trưởng bộ phận duyệt > HR xác nhận. Chưa tự động gửi email thông báo.",
      noiDungDieuChinh: "1. Thêm bước thông báo email tự động sau mỗi lần phê duyệt\n2. Cho phép nhân viên xem lịch sử đơn\n3. Thêm chế độ \"Phê duyệt tự động\" cho nghỉ phép ≤ 1 ngày",
      quyTrinhThaoTac: "Bước 1: Đăng nhập HRM\nBước 2: Vào Đề nghị > Nghỉ phép\nBước 3: Điền thông tin (loại nghỉ, ngày, lý do)\nBước 4: Nộp đơn\nBước 5: Trưởng bộ phận nhận thông báo và phê duyệt\nBước 6: HR xác nhận cuối cùng",
    },
    {
      title: "Cập nhật API tích hợp hệ thống kế toán",
      description: "Nâng cấp API kết nối với phần mềm kế toán MISA",
      status: "resolved",
      priority: "high",
      requesterId: requester2.id,
      assigneeId: agent1.id,
      categoryId: catFinance.id,
      deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      linkSite: "https://accounting.company.com",
      donVi: "Phòng Kế toán",
      linkChucNang: "https://accounting.company.com/api/integration",
      hienTrang: "API hiện tại sử dụng phiên bản cũ, thường xuyên bị timeout khi đồng bộ dữ liệu lớn.",
      noiDungDieuChinh: "Nâng cấp API từ v1 lên v2, hỗ trợ batch processing, giảm timeout từ 30s xuống 10s.",
    },
  ];

  const createdRequests = [];
  for (const req of requests) {
    const created = await prisma.request.create({ data: req });
    createdRequests.push(created);
  }

  console.log("✅ Created requests");

  // Create comments
  await prisma.comment.createMany({
    data: [
      {
        content: "Tôi đã kiểm tra code, phần validating input ở bước captcha cần bổ sung logic timeout. Đang fix.",
        userId: agent1.id,
        requestId: createdRequests[0].id,
      },
      {
        content: "Anh ơi, khi nào hoàn thành được ạ? Team Sales đang cần form mới để chạy campaign.",
        userId: requester1.id,
        requestId: createdRequests[0].id,
      },
      {
        content: "Dự kiến 2 ngày nữa sẽ xong. Bạn có thể test trên staging trước khi deploy production.",
        userId: agent1.id,
        requestId: createdRequests[0].id,
      },
      {
        content: "[Nội bộ] Đã xác nhận root cause: timeout ở webhook callback là do retry logic không đúng. Đang sửa.",
        userId: agent1.id,
        requestId: createdRequests[4].id,
        isInternal: true,
      },
      {
        content: "Đã deploy hotfix lên staging. Bạn kiểm tra lại xem giao dịch đã được ghi nhận đầy đủ chưa.",
        userId: agent2.id,
        requestId: createdRequests[4].id,
      },
      {
        content: "Cảm ơn anh! Đã test OK trên staging, 100% giao dịch đều ghi nhận đúng.",
        userId: requester1.id,
        requestId: createdRequests[4].id,
      },
    ],
  });

  console.log("✅ Created comments");

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: "created",
        details: JSON.stringify({ title: "Điều chỉnh form đăng nhập hệ thống CRM" }),
        userId: requester1.id,
        requestId: createdRequests[0].id,
      },
      {
        action: "status_changed",
        details: JSON.stringify({ oldStatus: "new", newStatus: "in_progress" }),
        userId: agent1.id,
        requestId: createdRequests[0].id,
      },
      {
        action: "created",
        details: JSON.stringify({ title: "Điều chỉnh quy trình phê duyệt đơn hàng mua sắm" }),
        userId: requester1.id,
        requestId: createdRequests[2].id,
      },
      {
        action: "status_changed",
        details: JSON.stringify({ oldStatus: "in_progress", newStatus: "waiting_response" }),
        userId: agent1.id,
        requestId: createdRequests[2].id,
      },
      {
        action: "commented",
        details: JSON.stringify({ isInternal: true }),
        userId: agent1.id,
        requestId: createdRequests[4].id,
      },
      {
        action: "status_changed",
        details: JSON.stringify({ oldStatus: "in_progress", newStatus: "resolved" }),
        userId: agent2.id,
        requestId: createdRequests[4].id,
      },
    ],
  });

  console.log("✅ Created audit logs");

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        title: "Yêu cầu mới được giao",
        message: "Bạn có yêu cầu mới: Điều chỉnh form đăng nhập hệ thống CRM",
        type: "assignment",
        userId: agent1.id,
        link: `/requests/${createdRequests[0].id}`,
      },
      {
        title: "Yêu cầu mới được giao",
        message: "Bạn có yêu cầu mới: Cấp quyền truy cập hệ thống HRM cho nhân viên mới",
        type: "assignment",
        userId: agent2.id,
        link: `/requests/${createdRequests[1].id}`,
      },
      {
        title: "Cập nhật yêu cầu",
        message: 'Yêu cầu "Điều chỉnh form đăng nhập hệ thống CRM" đã được chuyển sang trạng thái Đang xử lý',
        type: "status_change",
        userId: requester1.id,
        link: `/requests/${createdRequests[0].id}`,
        isRead: true,
      },
      {
        title: "Bình luận mới",
        message: 'Có bình luận mới trên yêu cầu "Điều chỉnh form đăng nhập hệ thống CRM"',
        type: "comment",
        userId: requester1.id,
        link: `/requests/${createdRequests[0].id}`,
      },
      {
        title: "Yêu cầu quá hạn",
        message: 'Yêu cầu "Điều chỉnh quy trình phê duyệt đơn hàng mua sắm" đã quá hạn xử lý',
        type: "overdue",
        userId: agent1.id,
        link: `/requests/${createdRequests[2].id}`,
      },
    ],
  });

  console.log("✅ Created notifications");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\nDemo accounts:");
  console.log("  Admin:     admin@demo.com / password123");
  console.log("  Agent:     agent@demo.com / password123");
  console.log("  Agent 2:   agent2@demo.com / password123");
  console.log("  Requester: requester@demo.com / password123");
  console.log("  User 2:    user2@demo.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
