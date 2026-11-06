"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

type Mode = "daily" | "weekly";

interface BatRunResult {
  trigger: "schedule" | "manual";
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  success: boolean;
  output: string;
  error?: string;
}

interface BatScheduleConfig {
  enabled: boolean;
  batPath: string;
  mode: Mode;
  weekdays: number[];
  times: string[];
  lastRunKey: string | null;
  lastRunAt: string | null;
  lastResult: BatRunResult | null;
}

const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}

export default function BatScheduler() {
  const [config, setConfig] = useState<BatScheduleConfig | null>(null);
  const [nextRun, setNextRun] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/bat-schedule");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setNextRun(data.nextRun);
        setIsRunning(Boolean(data.isRunning));
      }
    } catch {
      setMessage({ type: "error", text: "Không tải được cấu hình" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(patch: Partial<BatScheduleConfig>) {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function handleSave() {
    if (!config) return;

    if (config.times.length === 0 || config.times.some((time) => !time)) {
      setMessage({
        type: "error",
        text: "Vui lòng nhập đầy đủ các mốc giờ chạy",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/bat-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          batPath: config.batPath,
          mode: config.mode,
          weekdays: config.weekdays,
          times: config.times,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setConfig(data.config);
        setNextRun(data.nextRun);
        setMessage({ type: "success", text: "Đã lưu lịch chạy báo cáo" });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Không lưu được cấu hình",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Đã có lỗi xảy ra" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/bat-schedule", { method: "PUT" });
      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: data.result?.success ? "success" : "error",
          text: data.result?.success
            ? "Script đã chạy thành công"
            : "Script chạy xong nhưng trả về lỗi",
        });
      } else {
        setMessage({
          type: "error",
          text: data.result?.error || data.error || "Không chạy được script",
        });
      }

      await load();
    } catch {
      setMessage({ type: "error", text: "Đã có lỗi xảy ra khi chạy script" });
    } finally {
      setRunning(false);
    }
  }

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/bat-schedule/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        update({ batPath: data.path });
        setMessage({
          type: "success",
          text: `Đã tải lên ${data.filename}. Nhấn "Lưu lịch" để áp dụng.`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Không tải được file",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Đã có lỗi xảy ra khi tải file" });
    } finally {
      setUploading(false);
    }
  }

  function updateTime(index: number, value: string) {
    if (!config) return;
    update({
      times: config.times.map((time, i) => (i === index ? value : time)),
    });
  }

  /** Gợi ý mốc giờ mới: cộng dần 1 giờ từ mốc cuối và bỏ qua mốc đã có. */
  function suggestTime(times: string[]): string {
    const used = new Set(times);
    const [lastHour, lastMinute] = (times[times.length - 1] || "08:00")
      .split(":")
      .map(Number);

    for (let step = 1; step <= 24; step++) {
      const candidate = `${String((lastHour + step) % 24).padStart(2, "0")}:${String(
        Number.isFinite(lastMinute) ? lastMinute : 0
      ).padStart(2, "0")}`;
      if (!used.has(candidate)) return candidate;
    }

    return "08:00";
  }

  function addTime() {
    if (!config) return;
    update({ times: [...config.times, suggestTime(config.times)] });
  }

  function removeTime(index: number) {
    if (!config || config.times.length <= 1) return;
    update({ times: config.times.filter((_, i) => i !== index) });
  }

  function toggleWeekday(day: number) {
    if (!config) return;
    const weekdays = config.weekdays.includes(day)
      ? config.weekdays.filter((value) => value !== day)
      : [...config.weekdays, day];
    update({ weekdays });
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-vnpt-blue" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">Không tải được cấu hình.</p>
      </div>
    );
  }

  const lastResult = config.lastResult;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cấu hình */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-vnpt-lightblue rounded-lg">
            <CalendarClock className="w-5 h-5 text-vnpt-blue" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-vnpt-darkblue">
              Chạy báo cáo tự động
            </h3>
            <p className="text-xs text-gray-500">
              Chạy file .bat theo lịch để xuất báo cáo
            </p>
          </div>
        </div>

        {/* Bật/tắt */}
        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="w-4 h-4 text-vnpt-blue border-gray-300 rounded focus:ring-vnpt-blue"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">
              Bật lịch chạy tự động
            </p>
            <p className="text-xs text-gray-500">
              Tắt để tạm dừng mà không mất cấu hình
            </p>
          </div>
        </label>

        {/* File .bat */}
        <div>
          <label className="label">File .bat cần chạy *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.batPath}
              onChange={(e) => update({ batPath: e.target.value })}
              className="input-field flex-1"
              placeholder="C:\scripts\bao-cao.bat"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary flex items-center gap-2 whitespace-nowrap"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Chọn file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".bat,.cmd"
              className="hidden"
              onChange={handlePickFile}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            File chạy trên máy đang chạy server. File tải lên được lưu ở
            <span className="font-mono"> data/scripts</span> và chạy tại thư mục
            đó; nếu script dùng đường dẫn tương đối, hãy nhập đường dẫn gốc của
            file trên máy.
          </p>
        </div>

        {/* Chế độ */}
        <div>
          <label className="label">Tần suất</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="bat-mode"
                checked={config.mode === "daily"}
                onChange={() => update({ mode: "daily" })}
                className="text-vnpt-blue focus:ring-vnpt-blue"
              />
              Hằng ngày
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="bat-mode"
                checked={config.mode === "weekly"}
                onChange={() => update({ mode: "weekly" })}
                className="text-vnpt-blue focus:ring-vnpt-blue"
              />
              Theo ngày trong tuần
            </label>
          </div>
        </div>

        {/* Ngày trong tuần */}
        {config.mode === "weekly" && (
          <div>
            <label className="label">Chọn ngày chạy</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const active = config.weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      active
                        ? "bg-vnpt-blue text-white border-vnpt-blue"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Các mốc giờ chạy */}
        <div>
          <label className="label">Các mốc giờ chạy (Việt Nam)</label>
          <div className="space-y-2">
            {config.times.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => updateTime(index, e.target.value)}
                  className="input-field w-40"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeTime(index)}
                  disabled={config.times.length <= 1}
                  title="Xoá mốc giờ"
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTime}
            className="btn-secondary flex items-center gap-2 mt-2"
          >
            <Plus className="w-4 h-4" />
            Thêm mốc giờ
          </button>
          <p className="text-xs text-gray-500 mt-1.5">
            Script chạy mỗi mốc một lần trong ngày, ví dụ 08:00, 13:30, 17:00.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Lịch chỉ chạy khi server đang bật. Lần chạy kế tiếp:{" "}
            <span className="font-medium">{nextRun || "—"}</span>
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Đang lưu..." : "Lưu lịch"}
          </button>
          <button
            type="button"
            onClick={handleRunNow}
            disabled={running || isRunning || !config.batPath}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running || isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {running || isRunning ? "Đang chạy..." : "Chạy thử ngay"}
          </button>
        </div>
      </div>

      {/* Kết quả lần chạy gần nhất */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-vnpt-darkblue">
            Lần chạy gần nhất
          </h3>
          {lastResult && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                lastResult.success
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {lastResult.success ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {lastResult.success ? "Thành công" : "Thất bại"}
            </span>
          )}
        </div>

        {!lastResult ? (
          <p className="text-sm text-gray-500">
            Chưa có lần chạy nào. Cấu hình lịch rồi nhấn &quot;Chạy thử ngay&quot;
            để kiểm tra.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Kích hoạt</p>
                <p className="text-gray-700">
                  {lastResult.trigger === "schedule" ? "Theo lịch" : "Chạy tay"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mã thoát</p>
                <p className="text-gray-700">{lastResult.exitCode ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Bắt đầu</p>
                <p className="text-gray-700">
                  {formatDateTime(lastResult.startedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Kết thúc</p>
                <p className="text-gray-700">
                  {formatDateTime(lastResult.finishedAt)}
                </p>
              </div>
            </div>

            {lastResult.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {lastResult.error}
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 mb-1">
                Kết quả in ra (tối đa 4000 ký tự)
              </p>
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 max-h-80 overflow-auto whitespace-pre-wrap break-words">
                {lastResult.output || "(không có nội dung in ra)"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
