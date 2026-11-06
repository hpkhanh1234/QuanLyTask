"use client";

import { useState } from "react";
import { Play, Loader2, Check, AlertCircle, Clock, RefreshCw } from "lucide-react";

interface CronResult {
  success: boolean;
  stats?: {
    overdueRequests: number;
    approachingDeadline: number;
    notificationsSent: number;
    errors: number;
  };
  error?: string;
}

export default function CronRunner() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CronResult | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function handleRunCron() {
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/cron/check-overdue");
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, stats: data.stats });
        setLastRun(new Date().toLocaleString("vi-VN"));
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (error) {
      setResult({ success: false, error: "Đã có lỗi xảy ra khi gọi API" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-vnpt-accent" />
        <h3 className="text-lg font-semibold text-vnpt-darkblue">Kiểm tra yêu cầu quá hạn</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Kiểm tra và gửi thông báo cho các yêu cầu sắp hết hạn hoặc đã quá hạn.
        Nhấn nút bên dưới để chạy ngay lập tức.
      </p>

      <div className="flex items-center gap-4">
        <button
          onClick={handleRunCron}
          disabled={running}
          className="btn-primary flex items-center gap-2"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang kiểm tra...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Chạy kiểm tra ngay
            </>
          )}
        </button>

        {lastRun && (
          <span className="text-xs text-gray-500">
            Lần chạy cuối: {lastRun}
          </span>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            result.success ? "bg-green-50" : "bg-red-50"
          }`}
        >
          {result.success ? (
            <div>
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Check className="w-4 h-4" />
                <span className="font-medium">Kiểm tra thành công!</span>
              </div>
              {result.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {result.stats.overdueRequests}
                    </p>
                    <p className="text-xs text-gray-600">Quá hạn</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {result.stats.approachingDeadline}
                    </p>
                    <p className="text-xs text-gray-600">Sắp hết hạn</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {result.stats.notificationsSent}
                    </p>
                    <p className="text-xs text-gray-600">Đã gửi Telegram</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {result.stats.errors}
                    </p>
                    <p className="text-xs text-gray-600">Lỗi</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{result.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
        <p className="font-medium mb-1">📌 Lưu ý:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Cron job sẽ kiểm tra yêu cầu có hạn chót trong vòng 2 ngày</li>
          <li>Gửi Telegram cho cả người tạo và người xử lý</li>
          <li>Tự động tạo thông báo trong app</li>
          <li>Chỉ gửi 1 lần mỗi ngày cho mỗi yêu cầu</li>
        </ul>
      </div>
    </div>
  );
}
