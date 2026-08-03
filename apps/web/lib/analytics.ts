import { db } from '@workspace/db'
import { startOfDay } from '@/lib/time-utils'
import {
  emailOpens,
  linkClicks,
  campaigns,
  sequences,
  leads,
  dailyAnalytics,
  links,
  messages,
} from '@workspace/db/schema'
import { eq, sql, and, gte, lt } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface OpenAnalyticsInput {
  trackingId: string
  messageId: string
  campaignId: number | null
  leadId: number | null
  userAgent?: string
  ipAddress?: string
}

export interface ClickAnalyticsInput {
  trackingId: string
  messageId: string
  campaignId: number | null
  leadId: number | null
  sequenceId: number | null
  originalUrl: string
  userAgent?: string
  ipAddress?: string
}

// ---------------------------------------------------------------------------
// Open tracking
// ---------------------------------------------------------------------------

export async function recordOpen(input: OpenAnalyticsInput): Promise<void> {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = new Date(todayStart.getTime() + 86_400_000)

  try {
    const existingRows = await db
      .select({ messageId: emailOpens.messageId })
      .from(emailOpens)
      .where(
        and(
          eq(emailOpens.trackingId, input.trackingId),
          gte(emailOpens.openedAt, todayStart),
          lt(emailOpens.openedAt, todayEnd),
        ),
      )
      .limit(1)

    if (existingRows.length === 0) {
      const messageExists = input.messageId
        ? await db
            .select({ id: messages.id })
            .from(messages)
            .where(eq(messages.id, Number(input.messageId)))
            .limit(1)
            .then((r) => r.length > 0)
        : false

      const resolvedMessageId = messageExists ? input.messageId : ''

      const [openRow] = await db
        .insert(emailOpens)
        .values({
          trackingId: input.trackingId,
          messageId: resolvedMessageId,
          campaignId: input.campaignId ?? null,
          leadId: input.leadId ?? null,
          openedAt: now,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
        })
        .onConflictDoNothing()
        .returning()

      if (openRow && resolvedMessageId) {
        await updateDailyAnalytics(todayStart, { opens: 1 })
        if (input.campaignId) {
          await db
            .update(campaigns)
            .set({
              opens: sql`${campaigns.opens} + 1`,
              lastOpenAt: now,
            })
            .where(eq(campaigns.id, input.campaignId))
        }
        if (input.leadId) {
          await db
            .update(leads)
            .set({ openedAt: now })
            .where(eq(leads.id, input.leadId))
        }
      }
    }
  } catch (err) {
    console.error('[Lightreach][analytics] open tracking failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Click tracking
// ---------------------------------------------------------------------------

export async function recordClick(input: ClickAnalyticsInput): Promise<void> {
  const now = new Date()

  try {
    const [clickRow] = await db
      .insert(linkClicks)
      .values({
        trackingId: input.trackingId,
        messageId: input.messageId,
        campaignId: input.campaignId ?? null,
        leadId: input.leadId ?? null,
        originalUrl: input.originalUrl,
        clickedAt: now,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      })
      .onConflictDoNothing()
      .returning()

    if (clickRow) {
      const todayStart = startOfDay(now)
      await updateDailyAnalytics(todayStart, {
        clicks: 1,
      })
      if (input.campaignId) {
        await db
          .update(campaigns)
          .set({
            clicks: sql`${campaigns.clicks} + 1`,
            lastClickAt: now,
          })
          .where(eq(campaigns.id, input.campaignId))
      }
      if (input.sequenceId) {
        await db
          .update(sequences)
          .set({ clicks: sql`${sequences.clicks} + 1`, lastClickAt: now })
          .where(eq(sequences.id, input.sequenceId))
      }
      if (input.leadId) {
        await db
          .update(leads)
          .set({ clickedAt: now })
          .where(eq(leads.id, input.leadId))
      }
      await db
        .insert(links)
        .values({
          messageId: input.messageId,
          url: input.originalUrl,
          clicks: 1,
        })
        .onConflictDoUpdate({
          target: [links.messageId, links.url],
          set: { clicks: sql`${links.clicks} + 1` },
        })
    }
  } catch (err) {
    console.error('[Lightreach][analytics] click tracking failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateDailyAnalytics(
  date: Date,
  patch: { opens?: number; clicks?: number },
): Promise<void> {
  const dateStr = new Date(
    Math.floor(date.getTime() / 86400_000) * 86400_000,
  )

  const [existing] = await db
    .select({ id: dailyAnalytics.id })
    .from(dailyAnalytics)
    .where(eq(dailyAnalytics.date, dateStr))
    .limit(1)

  if (existing) {
    const sets: Record<string, unknown> = {}
    if (patch.opens) sets.opens = sql`${dailyAnalytics.opens} + ${patch.opens}`
    if (patch.clicks) sets.clicks = sql`${dailyAnalytics.clicks} + ${patch.clicks}`
    if (Object.keys(sets).length > 0) {
      await db.update(dailyAnalytics).set(sets).where(eq(dailyAnalytics.id, existing.id))
    }
  } else {
    await db.insert(dailyAnalytics).values({
      date: dateStr,
      opens: patch.opens ?? 0,
      clicks: patch.clicks ?? 0,
    })
  }
}
