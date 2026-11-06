"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Check, X, ExternalLink, Copy, Send, Loader2 } from "lucide-react";

interface TelegramConnectProps {
  onConnectionChange?: (connected: boolean) => void;
}

export default function TelegramConnect({ onConnectionChange }: TelegramConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [chatId, setChatId] = useState("");
  const [inputChatId, setInputChatId] = useState("");
  const [botInfo, setBotInfo] = useState<{ username: string; first_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchTelegramInfo();
  }, []);

  async function fetchTelegramInfo() {
    try {
      const res = await fetch("/api/telegram");
      const data = await res.json();
      setIsConnected(data.isConnected);
      setChatId(data.chatId || "");
      setBotInfo(data.botInfo);
    } catch (error) {
      console.error("Error fetching Telegram info:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!inputChatId.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập Chat ID" });
      return;
    }

    setConnecting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: inputChatId.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsConnected(true);
        setChatId(inputChatId.trim());
        setMessage({ type: "success", text: data.message });
        onConnectionChange?.(true);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Đã có lỗi xảy ra" });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Bạn có chắc muốn ngắt kết nối Telegram?")) return;

    try {
      const res = await fetch("/api/telegram", { method: "DELETE" });
      if (res.ok) {
        setIsConnected(false);
        setChatId("");
        setInputChatId("");
        setMessage({ type: "success", text: "Đã ngắt kết nối Telegram" });
        onConnectionChange?.(false);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Đã có lỗi xảy ra" });
    }
  }

  function copyBotUsername() {
    if (botInfo?.username) {
      navigator.clipboard.writeText(`@${botInfo.username}`);
      setMessage({ type: "success", text: "Đã copy tên bot!" });
    }
  }

  async function handleTestMessage() {
    setTesting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Đã có lỗi xảy ra" });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full ${isConnected ? "bg-green-100" : "bg-gray-100"}`}>
          <MessageCircle className={`w-6 h-6 ${isConnected ? "text-green-600" : "text-gray-500"}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-vnpt-darkblue">Telegram Notifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Nhận thông báo qua Telegram khi yêu cầu sắp hết hạn hoặc quá hạn
          </p>

          {isConnected ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Đã kết nối</span>
              </div>
              <div className="text-xs text-gray-500">
                Chat ID: <code className="bg-gray-100 px-1 rounded">{chatId}</code>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestMessage}
                  disabled={testing}
                  className="text-sm text-vnpt-blue hover:text-vnpt-darkblue flex items-center gap-1"
                >
                  {testing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Gửi tin nhắn test
                </button>
                <button
                  onClick={handleDisconnect}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Ngắt kết nối
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Steps to connect */}
              <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
                <p className="font-medium text-blue-800">Hướng dẫn kết nối:</p>
                <ol className="list-decimal list-inside text-blue-700 space-y-1">
                  <li>
                    Mở Telegram và tìm bot:{" "}
                    {botInfo ? (
                      <button
                        onClick={copyBotUsername}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-mono"
                      >
                        @{botInfo.username}
                        <Copy className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-blue-500">(đang tải...)</span>
                    )}
                  </li>
                  <li>Nhấn "Start" để bắt đầu</li>
                  <li>
                    Gõ lệnh <code className="bg-blue-100 px-1 rounded">/start</code> và gửi đi
                  </li>
                  <li>Sao chép Chat ID và dán vào bên dưới</li>
                </ol>
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputChatId}
                  onChange={(e) => setInputChatId(e.target.value)}
                  placeholder="Nhập Chat ID từ Telegram..."
                  className="input-field flex-1"
                />
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="btn-primary flex items-center gap-2"
                >
                  {connecting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Kết nối
                </button>
              </div>

              {/* Help link */}
              <a
                href="https://core.telegram.org/bots#how-do-i-create-a-bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <ExternalLink className="w-3 h-3" />
                Hướng dẫn tạo Telegram Bot
              </a>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`mt-3 p-2 rounded text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
