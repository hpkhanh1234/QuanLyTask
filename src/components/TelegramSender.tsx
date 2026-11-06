"use client";

import { useState } from "react";
import { Send, Users, User, Loader2, Check, AlertCircle } from "lucide-react";

type SendType = "personal" | "group";

export default function TelegramSender() {
  const [sendType, setSendType] = useState<SendType>("personal");
  const [chatId, setChatId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    
    if (!chatId.trim()) {
      setResult({ type: "error", text: "Vui lòng nhập Chat ID" });
      return;
    }
    if (!message.trim()) {
      setResult({ type: "error", text: "Vui lòng nhập nội dung tin nhắn" });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId.trim(),
          message: message.trim(),
          type: sendType,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", text: data.message });
        setMessage(""); // Clear message after success
      } else {
        setResult({ type: "error", text: data.error });
      }
    } catch (error) {
      setResult({ type: "error", text: "Đã có lỗi xảy ra" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Send className="w-5 h-5 text-vnpt-accent" />
        <h3 className="text-lg font-semibold text-vnpt-darkblue">Gửi tin nhắn Telegram</h3>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSendType("personal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            sendType === "personal"
              ? "bg-vnpt-blue text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <User className="w-4 h-4" />
          Gửi cá nhân
        </button>
        <button
          onClick={() => setSendType("group")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            sendType === "group"
              ? "bg-vnpt-blue text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Gửi group
        </button>
      </div>

      {/* Info Box */}
      <div className={`p-3 rounded-lg text-sm mb-4 ${
        sendType === "personal" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
      }`}>
        {sendType === "personal" ? (
          <p>
            <strong>Gửi cá nhân:</strong> Người nhận phải đã nhấn /start với bot để nhận được tin nhắn.
            Nhập Chat ID của người nhận.
          </p>
        ) : (
          <p>
            <strong>Gửi group:</strong> Bot phải được thêm vào group trước. Nhập Group Chat ID 
            (dạng số âm: <code>-123456789</code>).
          </p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="label">
            {sendType === "personal" ? "Chat ID người nhận" : "Group Chat ID"}
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder={sendType === "personal" ? "VD: 123456789" : "VD: -123456789"}
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">
            {sendType === "personal" 
              ? "Nhập số Chat ID từ Telegram"
              : "Nhập Group Chat ID (số âm)"}
          </p>
        </div>

        <div>
          <label className="label">Nội dung tin nhắn</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nhập nội dung tin nhắn..."
            className="input-field min-h-[120px]"
            rows={5}
          />
          <p className="text-xs text-gray-500 mt-1">
            Hỗ trợ HTML: <code>&lt;b&gt;đậm&lt;/b&gt;</code>, <code>&lt;i&gt;nghiêng&lt;/i&gt;</code>
          </p>
        </div>

        {/* Preview */}
        {message && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Xem trước:</p>
            <div 
              className="text-sm whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, "<br>") }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !chatId.trim() || !message.trim()}
          className="btn-primary flex items-center gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Gửi tin nhắn
            </>
          )}
        </button>
      </form>

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
    </div>
  );
}
