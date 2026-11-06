/**
 * Server-side cron runner - sends combined Telegram notification
 * Triggered manually via /api/cron/check-overdue; scheduled sends run in scripts/telegram-cron.js
 */

import prisma from "./prisma";
import { sendTelegramMessage, formatCombinedNotification } from "./telegram";
import {
  loadTelegramConfig,
  updateTelegramCronState,
} from "./telegram-config";

// ── Mutex lock ──
let isRunning = false;

interface CronState {
  lastRun: string | null;
  lastManualRun: string | null;
}

async function loadCronState(): Promise<CronState> {
  const config = await loadTelegramConfig();
  return {
    lastRun: config.lastCronRun,
    lastManualRun: config.lastManualRun,
  };
}

async function saveCronState(state: CronState): Promise<void> {
  await updateTelegramCronState({
    lastCronRun: state.lastRun,
    lastManualRun: state.lastManualRun,
  });
}

/**
 * Core logic: query requests and send combined message to group
 */
async function executeCheck(bypassDedup: boolean): Promise<{ ran: boolean; stats?: any }> {
  if (isRunning) {
    console.log("[Server Cron] Already running, skipping");
    return { ran: false };
  }

  const config = await loadTelegramConfig();
  if (!config.autoRunCron || !config.enabled) {
    return { ran: false };
  }

  isRunning = true;
  console.log(`[Server Cron] Running check (bypassDedup: ${bypassDedup})`);

  try {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const [overdueRequests, approachingDeadlineRequests] = await Promise.all([
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

    // Filter by config
    const filteredOverdue = config.notifyOnOverdue ? overdueRequests : [];
    const filteredUpcoming = config.notifyOnDeadline ? approachingDeadlineRequests : [];

    // Skip if nothing to send
    if (filteredOverdue.length === 0 && filteredUpcoming.length === 0) {
      const state = await loadCronState();
      state.lastRun = now.toISOString();
      await saveCronState(state);
      return { ran: true, stats: { notificationsSent: 0, skipped: "No requests" } };
    }

    // Build combined message
    const messageItems = [
      ...filteredOverdue.map((r) => ({
        title: r.title,
        deadline: r.deadline!,
        link: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/requests/${r.id}`,
        isOverdue: true as const,
      })),
      ...filteredUpcoming.map((r) => {
        const daysLeft = Math.ceil(
          (new Date(r.deadline!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          title: r.title,
          deadline: r.deadline!,
          link: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/requests/${r.id}`,
          isOverdue: false as const,
          daysLeft,
        };
      }),
    ];

    const combinedMessage = formatCombinedNotification(messageItems);

    // Send to group
    let notificationsSent = 0;
    let errors = 0;

    if (config.notifyGroupChatId) {
      const sent = await sendTelegramMessage(config.notifyGroupChatId, combinedMessage);
      if (sent) {
        notificationsSent++;
      } else {
        errors++;
      }
    }

    // In-app notifications for overdue
    for (const request of overdueRequests) {
      const fullRequest = await prisma.request.findUnique({
        where: { id: request.id },
        select: { requesterId: true, assigneeId: true },
      });
      if (!fullRequest) continue;

      const userIds = [fullRequest.assigneeId, fullRequest.requesterId].filter(Boolean);
      for (const userId of userIds) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: userId!,
            type: "overdue",
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            },
          },
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              title: "Yêu cầu quá hạn",
              message: `Có ${overdueRequests.length} yêu cầu quá hạn cần xử lý`,
              type: "overdue",
              userId: userId!,
              link: `/requests`,
            },
          });
        }
      }
    }

    // Save state
    const state = await loadCronState();
    state.lastRun = now.toISOString();
    await saveCronState(state);

    const stats = {
      overdueRequests: overdueRequests.length,
      approachingDeadline: approachingDeadlineRequests.length,
      notificationsSent,
      errors,
    };

    console.log(`[Server Cron] Completed:`, stats);
    return { ran: true, stats };
  } catch (error) {
    console.error("[Server Cron] Error:", error);
    const state = await loadCronState();
    state.lastRun = new Date().toISOString();
    await saveCronState(state);
    return { ran: true, stats: { error: String(error) } };
  } finally {
    isRunning = false;
  }
}

/**
 * Auto-run: called by cron-scheduler when time matches
 */
export async function runOverdueCheckIfDue(): Promise<{ ran: boolean; stats?: any }> {
  return executeCheck(false);
}

/**
 * Manual run: bypasses dedup, has 30-second cooldown
 */
export async function forceRunOverdueCheck(): Promise<{ ran: boolean; stats?: any }> {
  const state = await loadCronState();

  // 30-second cooldown for manual runs
  if (state.lastManualRun) {
    const lastRun = new Date(state.lastManualRun);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastRun.getTime()) / 1000;
    if (diffSeconds < 30) {
      console.log(`[Server Cron] Manual run cooldown: ${Math.ceil(30 - diffSeconds)}s remaining`);
      return { ran: false, stats: { cooldown: true, remainingSeconds: Math.ceil(30 - diffSeconds) } };
    }
  }

  state.lastManualRun = new Date().toISOString();
  await saveCronState(state);

  return executeCheck(true);
}
