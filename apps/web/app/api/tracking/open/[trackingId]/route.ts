import { db } from "@workspace/db"
import { appSettings, emailOpens, messages } from "@workspace/db/schema"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, gte, lt, sql } from "drizzle-orm"

const OPEN_TRACKING_SETTING = "enable_open_tracking"
const PIXEL_GIF_BYTES = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAP///yH/C05FVFNDQVBFMi4wAwEAAAAh+QQJAAABACwAAAAAAQABAAACAkQBACH5BAkAAAEALAAAAAABAAEAAAICRAEAIfkECQAAAQAsAAAAAAIAAQAAAgJEAQA7",
  "base64",
)

function ipFromRequest(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> },
) {
  const { trackingId } = await params

  let trackingEnabled = true
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, OPEN_TRACKING_SETTING))
    trackingEnabled = rows.length > 0 ? rows[0]!.value === "true" : true
  } catch {
    trackingEnabled = true
  }

  if (trackingEnabled) {
    try {
      const nowSec = Math.floor(Date.now() / 1000)
      const todayStart = new Date(Math.floor(nowSec / 86400) * 86400 * 1000)
      const todayEnd = new Date(todayStart.getTime() + 86400 * 1000)

      const existingRows = await db
        .select({ messageId: emailOpens.messageId, campaignId: emailOpens.campaignId, leadId: emailOpens.leadId })
        .from(emailOpens)
        .where(
          and(
            eq(emailOpens.trackingId, trackingId),
            gte(emailOpens.openedAt, todayStart),
            lt(emailOpens.openedAt, todayEnd),
          ),
        )
        .limit(1)

      if (existingRows.length === 0) {
        let messageId = existingRows[0]?.messageId ?? ""
        let campaignId = existingRows[0]?.campaignId ?? null
        let leadId = existingRows[0]?.leadId ?? null

        if (!messageId) {
          const msgRow = await db
            .select({ id: messages.id, campaignId: messages.campaignId, leadId: messages.leadId })
            .from(messages)
            .where(sql`${messages.renderedBody} LIKE ${`%/api/tracking/open/${trackingId}%`}`)
            .limit(1)

          if (msgRow.length > 0) {
            messageId = String(msgRow[0]!.id)
            campaignId = msgRow[0]!.campaignId ?? null
            leadId = msgRow[0]!.leadId
          }
        }

        if (messageId) {
          await db.insert(emailOpens).values({
            trackingId,
            messageId,
            campaignId: campaignId as number | null,
            leadId: leadId as number | null,
            openedAt: new Date(nowSec * 1000),
            userAgent: req.headers.get("user-agent") ?? undefined,
            ipAddress: ipFromRequest(req) ?? undefined,
          })
        }
      }
    } catch {
      // Silently ignore any tracking errors
    }
  }

  return new NextResponse(PIXEL_GIF_BYTES, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
