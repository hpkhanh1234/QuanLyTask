/**
 * Cron scheduler - manual trigger only
 * For automatic scheduling, run: node scripts/telegram-cron.js
 */

import { runOverdueCheckIfDue } from "./server-cron";

export async function triggerOverdueCheck(): Promise<{ ran: boolean; stats?: any }> {
  return runOverdueCheckIfDue();
}
