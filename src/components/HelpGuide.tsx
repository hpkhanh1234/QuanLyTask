"use client";

import { useState } from "react";
import { HelpCircle, X, ChevronDown, ChevronRight } from "lucide-react";

interface GuideItem {
  title: string;
  content: string;
  icon?: string;
}

interface HelpGuideProps {
  title: string;
  items: GuideItem[];
}

export default function HelpGuide({ title, items }: HelpGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  function toggleItem(index: number) {
    setExpandedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  return (
    <div className="card border-l-4 border-vnpt-accent">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-vnpt-accent" />
          <h3 className="text-sm font-semibold text-vnpt-darkblue">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="text-xs text-gray-400">
              Nhấn để xem hướng dẫn
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">{item.icon || "📌"}</span>
                <span className="flex-1 text-sm font-medium text-gray-700">
                  {item.title}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedItems.includes(index) ? "rotate-90" : ""
                  }`}
                />
              </button>
              {expandedItems.includes(index) && (
                <div className="px-3 pb-3 ml-8">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 mb-1">💡 Mẹo:</p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Sử dụng tìm kiếm để lọc nhanh</li>
              <li>• Nhấn vào tên để chỉnh sửa trực tiếp</li>
              <li>• Thay đổi sẽ được lưu ngay lập tức</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
