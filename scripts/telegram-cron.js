/**
 * Standalone Telegram cron script
 * Run with: node scripts/telegram-cron.js
 * 
 * Checks every 30 seconds if current time matches scheduled times.
 * Sends combined notification to Telegram group.
 * File-based dedup prevents double sends. Telegram configuration is stored in PostgreSQL.
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const SENT_FILE = path.join(__dirname, "..", "data", "cron-sent-today.json");
const prisma = new PrismaClient();

async function getConfig() {
  try {
    const record = await prisma.telegramConfig.findUnique({ where: { id: 1 } });
    if (!record) return null;

    let scheduledTimes = [];
    try {
      const parsed = JSON.parse(record.scheduledTimes || "[]");
      if (Array.isArray(parsed)) {
        scheduledTimes = parsed.filter((time) => typeof time === "string");
      }
    } catch {}

    return {
      enabled: record.enabled,
      notifyGroupChatId: record.notifyGroupChatId || "",
      notifyOnNewRequest: record.notifyOnNewRequest,
      notifyOnStatusChange: record.notifyOnStatusChange,
      notifyOnDeadline: record.notifyOnDeadline,
      notifyOnOverdue: record.notifyOnOverdue,
      autoRunCron: record.autoRunCron,
      scheduledTimes,
    };
  } catch {
    return null;
  }
}

function getVNToday2() {
  const s = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [m, d, y] = s.split("/");
  return `${y}-${m}-${d}`;
}

function getVNTime() {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getVNDateTime() {
  const now = new Date();
  const vnDate = now.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const vnTime = now.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date: vnDate, time: vnTime };
}

function loadSentToday() {
  try {
    if (fs.existsSync(SENT_FILE)) {
      const data = JSON.parse(fs.readFileSync(SENT_FILE, "utf-8"));
      const today = getVNToday2();
      const cleaned = {};
      for (const [key, val] of Object.entries(data)) {
        if (key.startsWith(today)) cleaned[key] = val;
      }
      return cleaned;
    }
  } catch {}
  return {};
}

function saveSentToday(data) {
  fs.writeFileSync(SENT_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function sendTelegramMessage(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[Telegram] No TELEGRAM_BOT_TOKEN env var");
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`[Telegram] Sent to ${chatId}`);
      return true;
    } else {
      console.error(`[Telegram] Error:`, data.description);
      return false;
    }
  } catch (err) {
    console.error(`[Telegram] Fetch error:`, err.message);
    return false;
  }
}

function formatReportMessage(filteredOverdue, filteredUpcoming) {
  const { date, time } = getVNDateTime();
  const total = filteredOverdue.length + filteredUpcoming.length;
  
  let msg = `<blockquote expandable>📊 <b>BÁO CÁO HÀNG NGÀY</b></blockquote>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📅 <i>${date} - ${time}</i>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (filteredOverdue.length > 0) {
    msg += `🔴 <b>QUÁ HẠN (${filteredOverdue.length})</b>\n`;
    msg += `┌─────────────────────────────\n`;
    filteredOverdue.forEach((r, i) => {
      const dl = new Date(r.deadline).toLocaleDateString("vi-VN");
      const prefix = i === filteredOverdue.length - 1 ? "└" : "├";
      msg += `${prefix}─ <b>${r.title}</b>\n`;
      msg += `${i === filteredOverdue.length - 1 ? " " : "│"}   ⏰ Hạn: ${dl}\n`;
    });
    msg += "\n";
  }

  if (filteredUpcoming.length > 0) {
    msg += `🟡 <b>SẮP HẾT HẠN (${filteredUpcoming.length})</b>\n`;
    msg += `┌─────────────────────────────\n`;
    filteredUpcoming.forEach((r, i) => {
      const dl = new Date(r.deadline).toLocaleDateString("vi-VN");
      const now = new Date();
      const daysLeft = Math.ceil((new Date(r.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const prefix = i === filteredUpcoming.length - 1 ? "└" : "├";
      msg += `${prefix}─ <b>${r.title}</b>\n`;
      msg += `${i === filteredUpcoming.length - 1 ? " " : "│"}   ⏰ Còn ${daysLeft} ngày (hạn: ${dl})\n`;
    });
    msg += "\n";
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📌 <i>Tổng: ${total} yêu cầu cần xử lý</i>\n`;
  msg += `🔔 <i>Báo cáo tự động</i>`;

  return msg;
}

async function runCheck() {
  const config = await getConfig();
  if (!config || !config.autoRunCron || !config.enabled || !config.scheduledTimes?.length) return;

  const vnTime = getVNTime();
  const matchedTime = config.scheduledTimes.find((t) => t === vnTime);
  if (!matchedTime) return;

  // File-based dedup
  const today = getVNToday2();
  const sentToday = loadSentToday();
  const dedupKey = `${today}:${matchedTime}`;
  if (sentToday[dedupKey]) return;

  console.log(`[Cron] Time match: ${vnTime} (VN) - Running check...`);
  sentToday[dedupKey] = new Date().toISOString();
  saveSentToday(sentToday);

  // Query overdue requests via Prisma
  try {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const [overdue, upcoming] = await Promise.all([
      prisma.request.findMany({
        where: {
          deadline: { lt: now },
          status: { notIn: ["resolved", "closed", "cancelled"] },
        },
        select: { id: true, title: true, deadline: true },
      }),
      prisma.request.findMany({
        where: {
          deadline: { gte: now, lte: twoDaysFromNow },
          status: { notIn: ["resolved", "closed", "cancelled"] },
        },
        select: { id: true, title: true, deadline: true },
      }),
    ]);

    const filteredOverdue = config.notifyOnOverdue ? overdue : [];
    const filteredUpcoming = config.notifyOnDeadline ? upcoming : [];

    if (filteredOverdue.length === 0 && filteredUpcoming.length === 0) {
      console.log("[Cron] No requests to notify");
      return;
    }

    const msg = formatReportMessage(filteredOverdue, filteredUpcoming);

    if (config.notifyGroupChatId) {
      await sendTelegramMessage(config.notifyGroupChatId, msg);
    }

    console.log(`[Cron] Completed: overdue=${filteredOverdue.length}, upcoming=${filteredUpcoming.length}`);
  } catch (err) {
    console.error("[Cron] Error:", err.message);
  }
}

// Run every 30 seconds
console.log("[Cron] Telegram cron started");
console.log("[Cron] Checking every 30 seconds...");

setInterval(runCheck, 30_000);

// Run immediately on start
runCheck();
