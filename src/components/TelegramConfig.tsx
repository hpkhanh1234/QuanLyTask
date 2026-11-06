"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Save, Loader2, Check, AlertCircle, Bell, Users, Clock, Play, Plus, X, Trash2 } from "lucide-react";

interface TelegramConfigData {
  enabled: boolean;
  notifyGroupChatId: string;
  notifyOnNewRequest: boolean;
  notifyOnStatusChange: boolean;
  notifyOnDeadline: boolean;
  notifyOnOverdue: boolean;
  autoRunCron: boolean;
  scheduledTimes: string[];
  lastCronRun: string | null;
}

const defaultConfig: TelegramConfigData = {
  enabled: false,
  notifyGroupChatId: "",
  notifyOnNewRequest: true,
  notifyOnStatusChange: true,
  notifyOnDeadline: true,
  notifyOnOverdue: true,
  autoRunCron: false,
  scheduledTimes: ["08:00", "12:00", "17:00"],
  lastCronRun: null,
};

export default function TelegramConfig() {
  const [config, setConfig] = useState<TelegramConfigData>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cronRunning, setCronRunning] = useState(false);
  const [newTime, setNewTime] = useState("12:00");
  const isRunningRef = useRef(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  // Note: Scheduled time checking is handled server-side in server-cron.ts
  // Client-side cron is removed to prevent duplicate messages

  async function handleRunCronNow() {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    setCronRunning(true);
    
    try {
      const res = await fetch("/api/cron/check-overdue?force=true");
      if (res.ok) {
        const data = await res.json();
        console.log("Cron job executed:", data.stats);
        const now = new Date().toISOString();
        setConfig(prev => ({ ...prev, lastCronRun: now }));
        setResult({ type: "success", text: `Đã kiểm tra xong! ${data.stats?.notificationsSent || 0} thông báo đã gửi.` });
      }
    } catch (error) {
      console.error("Error running cron job:", error);
      setResult({ type: "error", text: "Lỗi khi chạy cron job" });
    } finally {
      setCronRunning(false);
      isRunningRef.current = false;
    }
  }

  async function fetchConfig() {
    try {
      const res = await fetch("/api/telegram/config");
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", text: "Đã lưu cấu hình thành công!" });
      } else {
        setResult({ type: "error", text: data.error });
      }
    } catch (error) {
      setResult({ type: "error", text: "Đã có lỗi xảy ra" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestNotification() {
    try {
      const res = await fetch("/api/telegram/config", {
        method: "PATCH",
      });
      const data = await res.json();
      
      if (res.ok) {
        setResult({ type: "success", text: data.message });
      } else {
        setResult({ type: "error", text: data.error });
      }
    } catch (error) {
      setResult({ type: "error", text: "Đã có lỗi xảy ra" });
    }
  }

  function addTime() {
    if (newTime && !config.scheduledTimes.includes(newTime)) {
      const sorted = [...config.scheduledTimes, newTime].sort();
      setConfig({ ...config, scheduledTimes: sorted });
      setNewTime("12:00");
    }
  }

  function removeTime(time: string) {
    setConfig({
      ...config,
      scheduledTimes: config.scheduledTimes.filter((t) => t !== time),
    });
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-vnpt-accent" />
        <h3 className="text-lg font-semibold text-vnpt-darkblue">Cấu hình thông báo Telegram</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Cấu hình tự động gửi tin nhắn Telegram khi có sự kiện quan trọng xảy ra.
      </p>

      {/* Enable/Disable */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-5 h-5 rounded text-vnpt-blue"
          />
          <div>
            <span className="font-medium text-gray-900">Bật thông báo tự động</span>
            <p className="text-xs text-gray-500">
              Gửi tin nhắn Telegram khi có sự kiện xảy ra
            </p>
          </div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Group Chat ID */}
          <div className="mb-6">
            <div>
              <label className="label flex items-center gap-2">
                <Users className="w-4 h-4 text-vnpt-accent" />
                Group Chat ID
              </label>
              <input
                type="text"
                value={config.notifyGroupChatId}
                onChange={(e) => setConfig({ ...config, notifyGroupChatId: e.target.value })}
                placeholder="VD: -1001234567890"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Group Chat ID (số âm) để gửi thông báo đến team. Nhân viên nhận tin qua Telegram đã gán ở trang Quản lý người dùng.
              </p>
            </div>
          </div>

          {/* Notification Types */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Loại thông báo</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyOnNewRequest}
                  onChange={(e) => setConfig({ ...config, notifyOnNewRequest: e.target.checked })}
                  className="w-4 h-4 rounded text-vnpt-blue"
                />
                <div>
                  <span className="font-medium text-gray-900 text-sm">Yêu cầu mới</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyOnStatusChange}
                  onChange={(e) => setConfig({ ...config, notifyOnStatusChange: e.target.checked })}
                  className="w-4 h-4 rounded text-vnpt-blue"
                />
                <div>
                  <span className="font-medium text-gray-900 text-sm">Thay đổi trạng thái</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyOnDeadline}
                  onChange={(e) => setConfig({ ...config, notifyOnDeadline: e.target.checked })}
                  className="w-4 h-4 rounded text-vnpt-blue"
                />
                <div>
                  <span className="font-medium text-gray-900 text-sm">Sắp hết hạn</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyOnOverdue}
                  onChange={(e) => setConfig({ ...config, notifyOnOverdue: e.target.checked })}
                  className="w-4 h-4 rounded text-vnpt-blue"
                />
                <div>
                  <span className="font-medium text-gray-900 text-sm">Quá hạn</span>
                </div>
              </label>
            </div>
          </div>

          {/* Auto-run Cron with Scheduled Times */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-900">Tự động kiểm tra quá hạn</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoRunCron}
                  onChange={(e) => setConfig({ ...config, autoRunCron: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            
            {config.autoRunCron && (
              <div className="space-y-4">
                {/* Scheduled Times List */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Lịch gửi thông báo hàng ngày:
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {config.scheduledTimes.map((time) => (
                      <div
                        key={time}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-purple-200 rounded-full text-sm"
                      >
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        <span className="font-medium text-purple-700">{time}</span>
                        <button
                          onClick={() => removeTime(time)}
                          className="ml-1 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {config.scheduledTimes.length === 0 && (
                      <span className="text-sm text-gray-500 italic">Chưa có lịch nào</span>
                    )}
                  </div>

                  {/* Add new time */}
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="input-field w-auto text-sm"
                    />
                    <button
                      onClick={addTime}
                      disabled={!newTime || config.scheduledTimes.includes(newTime)}
                      className="btn-secondary flex items-center gap-1 text-sm py-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm giờ
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Trạng thái: {cronRunning ? (
                      <span className="text-green-600 font-medium">Đang chạy...</span>
                    ) : (
                      <span className="text-gray-600">Sẵn sàng</span>
                    )}
                  </span>
                  {config.lastCronRun && (
                    <span>
                      Lần chạy cuối: {new Date(config.lastCronRun).toLocaleString("vi-VN")}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleRunCronNow}
              disabled={cronRunning}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              {cronRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Chạy kiểm tra ngay
            </button>
            
            <button
              onClick={handleTestNotification}
              className="text-sm text-vnpt-blue hover:text-vnpt-darkblue flex items-center gap-1"
            >
              <Bell className="w-4 h-4" />
              Gửi tin nhắn test
            </button>
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Lưu cấu hình
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            result.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {result.type === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{result.text}</span>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
        <p className="font-medium mb-1">📌 Hướng dẫn:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Thêm các giờ cụ thể muốn nhận thông báo (VD: 08:00, 12:00, 17:00)</li>
          <li>Hệ thống sẽ tự động gửi tin nhắn vào các giờ đã chọn</li>
          <li>Nhấn nút ❌ để xóa giờ không cần thiết</li>
          <li>Hoặc nhấn &quot;Chạy kiểm tra ngay&quot; để kiểm tra thủ công</li>
        </ul>
      </div>
    </div>
  );
}
