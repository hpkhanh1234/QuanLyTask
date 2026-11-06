"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Wifi, WifiOff } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Xin chào! 👋 Tôi là trợ lý AI của hệ thống Quản lý Yêu cầu.\n\nBạn cần giúp gì? Hãy hỏi tôi về:\n• 📝 Tạo yêu cầu\n• 🔄 Quy trình xử lý\n• 📊 Báo cáo & thống kê\n• 📱 Cấu hình Telegram\n• 🔐 Đăng nhập",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [aiProvider, setAiProvider] = useState<string>("AI");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check Ollama connection on mount
  useEffect(() => {
    checkOllamaConnection();
  }, []);

  const checkOllamaConnection = async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
      });
      if (res.ok) {
        setAiStatus("connected");
      } else {
        setAiStatus("disconnected");
      }
    } catch {
      setAiStatus("disconnected");
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Call AI API with client-side timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: userMessage.content,
          }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "Xin lỗi, tôi không thể trả lời lúc này.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      let content = "❌ Không thể kết nối AI.";
      if (error.name === "AbortError") {
        content = "⏱️ AI phản hồi quá chậm. Đã chuyển sang chế độ phản hồi nhanh.";
      }
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button - Nhỏ gọn, sát mép */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-2 z-50 ${
          isOpen 
            ? "w-8 h-8 rounded-l-lg rounded-r-none" 
            : "w-10 h-10 rounded-l-lg rounded-r-none"
        } shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "bg-gray-500 hover:bg-gray-600 right-0"
            : "bg-gradient-to-r from-[#003B6F] to-[#0066B3] hover:from-[#002D54] hover:to-[#005299] right-0"
        }`}
        title={isOpen ? "Đóng chat" : "Trợ lý AI"}
      >
        {isOpen ? (
          <X className="w-4 h-4 text-white" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-14 right-0 z-50 w-[380px] h-[520px] bg-white rounded-tl-2xl rounded-bl-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003B6F] to-[#0066B3] text-white px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Trợ lý AI</h3>
              <div className="flex items-center gap-1.5 text-xs">
                {aiStatus === "connected" ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-300" />
                    <span className="text-green-300">Đã kết nối {aiProvider}</span>
                  </>
                ) : aiStatus === "disconnected" ? (
                  <>
                    <WifiOff className="w-3 h-3 text-yellow-300" />
                    <span className="text-yellow-300">Fallback mode</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 text-blue-200 animate-spin" />
                    <span className="text-blue-200">Đang kiểm tra...</span>
                  </>
                )}
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${aiStatus === "connected" ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#003B6F] to-[#0066B3] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#0066B3] text-white rounded-br-md"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#003B6F] to-[#0066B3] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[#0066B3] animate-spin" />
                    <span className="text-xs text-gray-500">Đang suy nghĩ...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-gray-100 bg-white">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { label: "Tạo yêu cầu", icon: "📝" },
                { label: "Quy trình", icon: "🔄" },
                { label: "Báo cáo", icon: "📊" },
                { label: "Telegram", icon: "📱" },
                { label: "Đăng nhập", icon: "🔐" },
              ].map((topic) => (
                <button
                  key={topic.label}
                  onClick={() => setInputValue(topic.label)}
                  className="px-3 py-1.5 text-xs font-medium text-[#0066B3] bg-blue-50 hover:bg-blue-100 rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
                >
                  <span>{topic.icon}</span>
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập câu hỏi..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent text-sm"
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="w-10 h-10 bg-[#0066B3] hover:bg-[#005299] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
