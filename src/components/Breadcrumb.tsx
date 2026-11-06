"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Tổng quan",
  requests: "Yêu cầu",
  new: "Tạo mới",
  workflow: "Quy trình",
  notifications: "Thông báo",
  reports: "Báo cáo & Thống kê",
  admin: "Quản trị",
  users: "Quản lý người dùng",
  categories: "Danh mục",
  priorities: "Mức độ ưu tiên",
  settings: "Cài đặt",
  help: "Hướng dẫn sử dụng",
};

interface BreadcrumbProps {
  /** Extra items appended after auto-generated ones */
  items?: { label: string; href?: string }[];
}

export default function Breadcrumb({ items = [] }: BreadcrumbProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Skip "app" group segment
  const visibleSegments = segments.filter((s) => s !== "(app)");

  const crumbs: { label: string; href: string }[] = visibleSegments.map(
    (seg, i) => {
      const href = "/" + visibleSegments.slice(0, i + 1).join("/");
      // Check if segment is a UUID-style ID (contains dashes)
      const isId = seg.includes("-") && seg.length > 8;
      const label = isId ? `#${seg.slice(0, 8)}` : LABELS[seg] || seg;
      return { label, href };
    }
  );

  // Append extra items
  items.forEach((item, i) => {
    crumbs.push({
      label: item.label,
      href: item.href || crumbs[crumbs.length - 1]?.href || "/",
    });
  });

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-vnpt-blue hover:text-primary-700 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Trang chủ</span>
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            {isLast ? (
              <span className="text-vnpt-darkblue font-medium">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-vnpt-blue hover:text-primary-700 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
