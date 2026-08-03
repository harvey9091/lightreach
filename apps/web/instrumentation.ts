/**
 * Lightreach in-process scheduler
 *
 * Next.js calls `register()` once when the Node.js server boots.
 * We use it to start the background send-loop tick and inbox poller.
 *
 * On production (Render), Render Cron Jobs also hit /api/cron/scheduler-tick
 * and /api/cron/inbox-poll every minute/2min respectively, so campaigns
 * continue even if the web process is spun down.
 *
 * For local development, the in-process timers provide immediate feedback
 * without needing to configure cron jobs.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { migrate } = await import("@workspace/db/migrate")
  await migrate()

  const { startScheduler } = await import("./lib/scheduler")
  startScheduler()

  const { startInboxPoller } = await import("./lib/inbox-poller")
  startInboxPoller()
}
