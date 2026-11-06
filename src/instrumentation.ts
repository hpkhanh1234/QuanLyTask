/**
 * Next.js instrumentation - runs once when the server starts.
 * Starts the scheduled .bat runner so reports run without opening the app.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBatScheduler } = await import("./lib/bat-scheduler");
    startBatScheduler();
  }
}
